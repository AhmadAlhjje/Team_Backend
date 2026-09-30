import { Injectable } from '@nestjs/common';

import type { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { AppException } from '../../common/errors/app-exception.js';
import { bySortOrder, nextSortOrder } from '../../common/utils/content.js';
import { assertConsentForPublishing } from '../../common/utils/publishing.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ContentStatus } from '../../generated/prisma/enums.js';
import { type CacheTag, RevalidationService } from '../revalidation/revalidation.service.js';
import type { ClientAdminDto, CreateClientDto, PublicClientDto, UpdateClientDto } from './dto/client.dto.js';

const AFFECTED_TAGS: CacheTag[] = ['clients', 'projects', 'stats'];

const adminInclude = { _count: { select: { projects: true } } } satisfies Prisma.ClientInclude;
type AdminClientRecord = Prisma.ClientGetPayload<{ include: typeof adminInclude }>;

function toAdminClient({ _count, ...client }: AdminClientRecord): ClientAdminDto {
  return { ...client, projectCount: _count.projects };
}

/** A client is public only when published AND consent was given. */
export const publicClientWhere = {
  status: ContentStatus.PUBLISHED,
  hasDisplayConsent: true,
} satisfies Prisma.ClientWhereInput;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  listPublished(): Promise<PublicClientDto[]> {
    return this.prisma.client.findMany({
      where: publicClientWhere,
      orderBy: bySortOrder,
      select: { id: true, name: true, logoUrl: true, websiteUrl: true, industry: true },
    });
  }

  async listForAdmin(query: AdminListQueryDto): Promise<ClientAdminDto[]> {
    const clients = await this.prisma.client.findMany({
      where: {
        status: query.status ?? undefined,
        ...(query.search ? { name: { contains: query.search } } : {}),
      },
      orderBy: bySortOrder,
      include: adminInclude,
    });
    return clients.map(toAdminClient);
  }

  async findOne(id: number): Promise<ClientAdminDto> {
    const client = await this.prisma.client.findUnique({ where: { id }, include: adminInclude });
    if (!client) throw AppException.notFound('Client');
    return toAdminClient(client);
  }

  async create(dto: CreateClientDto): Promise<ClientAdminDto> {
    assertConsentForPublishing(dto.status, dto.hasDisplayConsent ?? false);
    const max = await this.prisma.client.aggregate({ _max: { sortOrder: true } });
    const client = await this.prisma.client.create({
      data: { ...dto, sortOrder: nextSortOrder(max) },
      include: adminInclude,
    });
    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminClient(client);
  }

  async update(id: number, dto: UpdateClientDto): Promise<ClientAdminDto> {
    const current = await this.findOne(id);
    assertConsentForPublishing(dto.status ?? current.status, dto.hasDisplayConsent ?? current.hasDisplayConsent);

    const client = await this.prisma.client.update({ where: { id }, data: dto, include: adminInclude });
    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminClient(client);
  }

  async remove(id: number): Promise<void> {
    const client = await this.findOne(id);
    if (client.projectCount > 0) {
      throw AppException.inUse('This client is linked to projects. Archive the client or unlink the projects first.');
    }
    await this.prisma.client.delete({ where: { id } });
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.client.update({ where: { id }, data: { sortOrder: index } })),
    );
    this.revalidation.trigger(AFFECTED_TAGS);
  }
}
