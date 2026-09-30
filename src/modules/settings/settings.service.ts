import { Injectable } from '@nestjs/common';

import { bySortOrder } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { SiteSetting } from '../../generated/prisma/client.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import type {
  PublicSiteSettingsDto,
  ReplaceProcessStepsDto,
  ReplaceSocialLinksDto,
  UpdateSiteSettingsDto,
} from './dto/settings.dto.js';

export const SETTINGS_ID = 1;
const DEFAULT_SITE_NAME = 'Team';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async get(): Promise<PublicSiteSettingsDto> {
    const [settings, socialLinks, processSteps] = await Promise.all([
      this.ensureSettings(),
      this.prisma.socialLink.findMany({
        where: { teamMemberId: null },
        orderBy: bySortOrder,
        select: { platform: true, url: true, label: true },
      }),
      this.prisma.processStep.findMany({ orderBy: bySortOrder, select: { title: true, description: true } }),
    ]);

    const { id: _id, createdAt: _createdAt, ...fields } = settings;
    return { ...fields, socialLinks, processSteps };
  }

  async update(dto: UpdateSiteSettingsDto): Promise<PublicSiteSettingsDto> {
    await this.ensureSettings();
    await this.prisma.siteSetting.update({ where: { id: SETTINGS_ID }, data: dto });
    // foundedYear feeds the "years of experience" statistic.
    this.revalidation.trigger(['settings', 'stats']);
    return this.get();
  }

  async replaceSocialLinks(dto: ReplaceSocialLinksDto): Promise<PublicSiteSettingsDto> {
    await this.prisma.$transaction([
      this.prisma.socialLink.deleteMany({ where: { teamMemberId: null } }),
      this.prisma.socialLink.createMany({
        data: dto.links.map((link, index) => ({ ...link, sortOrder: index, teamMemberId: null })),
      }),
    ]);
    this.revalidation.trigger(['settings']);
    return this.get();
  }

  async replaceProcessSteps(dto: ReplaceProcessStepsDto): Promise<PublicSiteSettingsDto> {
    await this.prisma.$transaction([
      this.prisma.processStep.deleteMany({}),
      this.prisma.processStep.createMany({
        data: dto.steps.map((step, index) => ({ ...step, sortOrder: index })),
      }),
    ]);
    this.revalidation.trigger(['settings']);
    return this.get();
  }

  /** The settings row is created on first access if the seed has not run. */
  private ensureSettings(): Promise<SiteSetting> {
    return this.prisma.siteSetting.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID, siteName: DEFAULT_SITE_NAME },
    });
  }
}
