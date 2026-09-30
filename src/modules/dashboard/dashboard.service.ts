import { Injectable } from '@nestjs/common';

import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission, roleHasPermissions } from '../../common/auth/permissions.js';
import { publishedOnly } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ContentStatus, MessageStatus } from '../../generated/prisma/enums.js';
import type { DashboardDto, StatusCountsDto } from './dto/dashboard.dto.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthUser): Promise<DashboardDto> {
    const canReadMessages = roleHasPermissions(user.role, [Permission.MessagesManage]);

    const [projects, teamMembers, services, achievements, testimonials, clients, faqs, messages, recentMessages] =
      await Promise.all([
        this.prisma.project.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.teamMember.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.service.count({ where: publishedOnly }),
        this.prisma.achievement.count({ where: publishedOnly }),
        this.prisma.testimonial.count({ where: publishedOnly }),
        this.prisma.client.count({ where: publishedOnly }),
        this.prisma.faq.count({ where: publishedOnly }),
        canReadMessages
          ? Promise.all([
              this.prisma.contactMessage.count({ where: { status: MessageStatus.UNREAD } }),
              this.prisma.contactMessage.count(),
            ])
          : Promise.resolve(null),
        canReadMessages
          ? this.prisma.contactMessage.findMany({
              where: { status: { not: MessageStatus.ARCHIVED } },
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: { id: true, name: true, projectType: true, status: true, createdAt: true },
            })
          : Promise.resolve([]),
      ]);

    return {
      projects: toStatusCounts(projects),
      teamMembers: toStatusCounts(teamMembers),
      publishedServices: services,
      publishedAchievements: achievements,
      publishedTestimonials: testimonials,
      publishedClients: clients,
      publishedFaqs: faqs,
      messages: messages ? { unread: messages[0], total: messages[1] } : null,
      recentMessages,
    };
  }
}

function toStatusCounts(groups: Array<{ status: ContentStatus; _count: { _all: number } }>): StatusCountsDto {
  const count = (status: ContentStatus) => groups.find((group) => group.status === status)?._count._all ?? 0;
  return {
    published: count(ContentStatus.PUBLISHED),
    draft: count(ContentStatus.DRAFT),
    archived: count(ContentStatus.ARCHIVED),
  };
}
