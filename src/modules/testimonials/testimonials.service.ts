import { Injectable } from '@nestjs/common';

import type { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { AppException } from '../../common/errors/app-exception.js';
import { bySortOrder, nextSortOrder } from '../../common/utils/content.js';
import { assertConsentForPublishing } from '../../common/utils/publishing.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ContentStatus } from '../../generated/prisma/enums.js';
import { type CacheTag, RevalidationService } from '../revalidation/revalidation.service.js';
import type {
  CreateTestimonialDto,
  PublicTestimonialDto,
  TestimonialAdminDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto.js';

const AFFECTED_TAGS: CacheTag[] = ['testimonials', 'projects'];

const adminInclude = {
  project: { select: { id: true, slug: true, title: true } },
} satisfies Prisma.TestimonialInclude;

/** Public testimonials: published AND consent given. */
export const publicTestimonialWhere = {
  status: ContentStatus.PUBLISHED,
  hasDisplayConsent: true,
} satisfies Prisma.TestimonialWhereInput;

export const publicTestimonialSelect = {
  id: true,
  authorName: true,
  authorTitle: true,
  company: true,
  content: true,
  avatarUrl: true,
  project: { select: { slug: true, title: true, status: true } },
} satisfies Prisma.TestimonialSelect;

type PublicTestimonialRecord = Prisma.TestimonialGetPayload<{ select: typeof publicTestimonialSelect }>;

export function toPublicTestimonial({ project, ...testimonial }: PublicTestimonialRecord): PublicTestimonialDto {
  return {
    ...testimonial,
    // Only link to projects that are publicly visible.
    project:
      project && project.status === ContentStatus.PUBLISHED ? { slug: project.slug, title: project.title } : null,
  };
}

@Injectable()
export class TestimonialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async listPublished(): Promise<PublicTestimonialDto[]> {
    const testimonials = await this.prisma.testimonial.findMany({
      where: publicTestimonialWhere,
      orderBy: bySortOrder,
      select: publicTestimonialSelect,
    });
    return testimonials.map(toPublicTestimonial);
  }

  listForAdmin(query: AdminListQueryDto): Promise<TestimonialAdminDto[]> {
    return this.prisma.testimonial.findMany({
      where: {
        status: query.status ?? undefined,
        ...(query.search
          ? { OR: [{ authorName: { contains: query.search } }, { company: { contains: query.search } }] }
          : {}),
      },
      orderBy: bySortOrder,
      include: adminInclude,
    });
  }

  async findOne(id: number): Promise<TestimonialAdminDto> {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id }, include: adminInclude });
    if (!testimonial) throw AppException.notFound('Testimonial');
    return testimonial;
  }

  async create(dto: CreateTestimonialDto): Promise<TestimonialAdminDto> {
    assertConsentForPublishing(dto.status, dto.hasDisplayConsent ?? false);
    await this.assertProjectExists(dto.projectId);
    const max = await this.prisma.testimonial.aggregate({ _max: { sortOrder: true } });

    const testimonial = await this.prisma.testimonial.create({
      data: { ...dto, sortOrder: nextSortOrder(max) },
      include: adminInclude,
    });
    this.revalidation.trigger(AFFECTED_TAGS);
    return testimonial;
  }

  async update(id: number, dto: UpdateTestimonialDto): Promise<TestimonialAdminDto> {
    const current = await this.findOne(id);
    assertConsentForPublishing(dto.status ?? current.status, dto.hasDisplayConsent ?? current.hasDisplayConsent);
    await this.assertProjectExists(dto.projectId);

    const testimonial = await this.prisma.testimonial.update({ where: { id }, data: dto, include: adminInclude });
    this.revalidation.trigger(AFFECTED_TAGS);
    return testimonial;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.testimonial.delete({ where: { id } });
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.testimonial.update({ where: { id }, data: { sortOrder: index } })),
    );
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  private async assertProjectExists(projectId: number | null | undefined): Promise<void> {
    if (projectId === null || projectId === undefined) return;
    const exists = await this.prisma.project.count({ where: { id: projectId } });
    if (!exists) throw AppException.invalidReference('projectId', 'Project does not exist');
  }
}
