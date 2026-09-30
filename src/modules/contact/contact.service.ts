import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';

import { AppException } from '../../common/errors/app-exception.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { MessageStatus } from '../../generated/prisma/enums.js';
import type {
  ContactMessageAdminDto,
  ContactMessagePageDto,
  CreateContactMessageDto,
  ListContactMessagesQueryDto,
  UpdateContactMessageDto,
} from './dto/contact.dto.js';

/** Submissions faster than this are almost certainly bots. */
export const MIN_HUMAN_FILL_TIME_MS = 3000;
const DEFAULT_PAGE_SIZE = 20;

const adminSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  projectType: true,
  budget: true,
  message: true,
  status: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ContactMessageSelect;

export function isLikelySpam(dto: Pick<CreateContactMessageDto, 'website' | 'elapsedMs'>): boolean {
  if (dto.website && dto.website.trim() !== '') return true;
  return dto.elapsedMs !== undefined && dto.elapsedMs < MIN_HUMAN_FILL_TIME_MS;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Stores a contact request. Spam (honeypot / too fast) receives the same
   * success response but is discarded, so bots cannot learn what was detected.
   */
  async submit(dto: CreateContactMessageDto, meta: { ip?: string; userAgent?: string }): Promise<{ success: true }> {
    if (isLikelySpam(dto)) {
      this.logger.warn({ ipHash: this.hashIp(meta.ip) }, 'Contact submission discarded as spam');
      return { success: true };
    }

    const message = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        company: dto.company ?? null,
        projectType: dto.projectType ?? null,
        budget: dto.budget ?? null,
        message: dto.message,
        ipHash: this.hashIp(meta.ip),
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
      },
      select: { id: true },
    });

    this.logger.log({ messageId: message.id }, 'New contact message received');
    return { success: true };
  }

  async list(query: ListContactMessagesQueryDto): Promise<ContactMessagePageDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.ContactMessageWhereInput = {
      status: query.status ?? undefined,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { email: { contains: query.search } },
              { company: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: adminSelect,
      }),
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.count({ where: { status: MessageStatus.UNREAD } }),
    ]);

    return { items, total, page, pageSize, unreadCount };
  }

  async findOne(id: number): Promise<ContactMessageAdminDto> {
    const message = await this.prisma.contactMessage.findUnique({ where: { id }, select: adminSelect });
    if (!message) throw AppException.notFound('Message');
    return message;
  }

  async updateStatus(id: number, dto: UpdateContactMessageDto): Promise<ContactMessageAdminDto> {
    const current = await this.findOne(id);
    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        status: dto.status,
        readAt: dto.status === MessageStatus.UNREAD ? null : (current.readAt ?? new Date()),
      },
      select: adminSelect,
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.contactMessage.delete({ where: { id } });
  }

  /** Keyed hash of the sender IP: lets admins spot repeat abuse without storing IPs. */
  private hashIp(ip: string | undefined): string | null {
    if (!ip) return null;
    return createHmac('sha256', this.config.jwtSecret).update(`contact-ip:${ip}`).digest('hex');
  }
}
