import { Injectable } from '@nestjs/common';

import type { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { AppException } from '../../common/errors/app-exception.js';
import { bySortOrder, nextSortOrder, publishedOnly } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import type { CreateFaqDto, FaqAdminDto, PublicFaqDto, UpdateFaqDto } from './dto/faq.dto.js';

@Injectable()
export class FaqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  listPublished(): Promise<PublicFaqDto[]> {
    return this.prisma.faq.findMany({
      where: publishedOnly,
      orderBy: bySortOrder,
      select: { id: true, question: true, answer: true },
    });
  }

  listForAdmin(query: AdminListQueryDto): Promise<FaqAdminDto[]> {
    return this.prisma.faq.findMany({
      where: {
        status: query.status ?? undefined,
        ...(query.search ? { question: { contains: query.search } } : {}),
      },
      orderBy: bySortOrder,
    });
  }

  async findOne(id: number): Promise<FaqAdminDto> {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) throw AppException.notFound('FAQ');
    return faq;
  }

  async create(dto: CreateFaqDto): Promise<FaqAdminDto> {
    const max = await this.prisma.faq.aggregate({ _max: { sortOrder: true } });
    const faq = await this.prisma.faq.create({ data: { ...dto, sortOrder: nextSortOrder(max) } });
    this.revalidation.trigger(['faqs']);
    return faq;
  }

  async update(id: number, dto: UpdateFaqDto): Promise<FaqAdminDto> {
    await this.findOne(id);
    const faq = await this.prisma.faq.update({ where: { id }, data: dto });
    this.revalidation.trigger(['faqs']);
    return faq;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.faq.delete({ where: { id } });
    this.revalidation.trigger(['faqs']);
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.faq.update({ where: { id }, data: { sortOrder: index } })),
    );
    this.revalidation.trigger(['faqs']);
  }
}
