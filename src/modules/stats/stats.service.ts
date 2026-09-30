import { Injectable } from '@nestjs/common';

import { publishedOnly } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ProjectPhase } from '../../generated/prisma/enums.js';
import { publicClientWhere } from '../clients/clients.service.js';
import { SETTINGS_ID } from '../settings/settings.service.js';
import type { PublicStatsDto } from './dto/stats.dto.js';

/**
 * Trust statistics computed from real data only — nothing is typed in by hand,
 * so the website can never display invented numbers.
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicStats(now = new Date()): Promise<PublicStatsDto> {
    const [projects, liveProjects, teamMembers, clients, achievements, settings] = await Promise.all([
      this.prisma.project.count({ where: publishedOnly }),
      this.prisma.project.count({ where: { ...publishedOnly, phase: ProjectPhase.LIVE } }),
      this.prisma.teamMember.count({ where: publishedOnly }),
      this.prisma.client.count({ where: publicClientWhere }),
      this.prisma.achievement.count({ where: publishedOnly }),
      this.prisma.siteSetting.findUnique({ where: { id: SETTINGS_ID }, select: { foundedYear: true } }),
    ]);

    return {
      projects,
      liveProjects,
      teamMembers,
      clients,
      achievements,
      yearsOfExperience: computeYearsOfExperience(settings?.foundedYear ?? null, now),
    };
  }
}

export function computeYearsOfExperience(foundedYear: number | null, now: Date): number | null {
  if (!foundedYear) return null;
  const years = now.getUTCFullYear() - foundedYear;
  return years >= 1 ? years : null;
}
