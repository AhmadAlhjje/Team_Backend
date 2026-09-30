import { Injectable } from '@nestjs/common';

import type { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { AppException } from '../../common/errors/app-exception.js';
import { bySortOrder, fromDateOnly, nextSortOrder, publishedOnly, toDateOnly } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ContentStatus } from '../../generated/prisma/enums.js';
import { type CacheTag, RevalidationService } from '../revalidation/revalidation.service.js';
import type {
  AchievementAdminDto,
  CreateAchievementDto,
  PublicAchievementDto,
  UpdateAchievementDto,
} from './dto/achievement.dto.js';

const AFFECTED_TAGS: CacheTag[] = ['achievements', 'projects', 'stats'];

const adminInclude = {
  project: { select: { id: true, slug: true, title: true } },
} satisfies Prisma.AchievementInclude;

type AdminAchievementRecord = Prisma.AchievementGetPayload<{ include: typeof adminInclude }>;

function toAdminAchievement(achievement: AdminAchievementRecord): AchievementAdminDto {
  return { ...achievement, date: fromDateOnly(achievement.date) };
}

@Injectable()
export class AchievementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async listPublished(): Promise<PublicAchievementDto[]> {
    const achievements = await this.prisma.achievement.findMany({
      where: publishedOnly,
      orderBy: bySortOrder,
      include: { project: { select: { slug: true, title: true, status: true } } },
    });

    return achievements.map((achievement) => ({
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      type: achievement.type,
      issuer: achievement.issuer,
      highlight: achievement.highlight,
      date: fromDateOnly(achievement.date),
      imageUrl: achievement.imageUrl,
      proofUrl: achievement.proofUrl,
      project:
        achievement.project?.status === ContentStatus.PUBLISHED
          ? { slug: achievement.project.slug, title: achievement.project.title }
          : null,
    }));
  }

  async listForAdmin(query: AdminListQueryDto): Promise<AchievementAdminDto[]> {
    const achievements = await this.prisma.achievement.findMany({
      where: {
        status: query.status ?? undefined,
        ...(query.search ? { title: { contains: query.search } } : {}),
      },
      orderBy: bySortOrder,
      include: adminInclude,
    });
    return achievements.map(toAdminAchievement);
  }

  async findOne(id: number): Promise<AchievementAdminDto> {
    const achievement = await this.prisma.achievement.findUnique({ where: { id }, include: adminInclude });
    if (!achievement) throw AppException.notFound('Achievement');
    return toAdminAchievement(achievement);
  }

  async create(dto: CreateAchievementDto): Promise<AchievementAdminDto> {
    await this.assertProjectExists(dto.projectId);
    const max = await this.prisma.achievement.aggregate({ _max: { sortOrder: true } });

    const achievement = await this.prisma.achievement.create({
      data: { ...dto, date: toDateOnly(dto.date), sortOrder: nextSortOrder(max) },
      include: adminInclude,
    });
    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminAchievement(achievement);
  }

  async update(id: number, dto: UpdateAchievementDto): Promise<AchievementAdminDto> {
    await this.findOne(id);
    await this.assertProjectExists(dto.projectId);

    const achievement = await this.prisma.achievement.update({
      where: { id },
      data: { ...dto, date: toDateOnly(dto.date) },
      include: adminInclude,
    });
    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminAchievement(achievement);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.achievement.delete({ where: { id } });
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.achievement.update({ where: { id }, data: { sortOrder: index } })),
    );
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  private async assertProjectExists(projectId: number | null | undefined): Promise<void> {
    if (projectId === null || projectId === undefined) return;
    const exists = await this.prisma.project.count({ where: { id: projectId } });
    if (!exists) throw AppException.invalidReference('projectId', 'Project does not exist');
  }
}
