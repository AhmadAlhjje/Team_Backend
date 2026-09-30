import { Injectable } from '@nestjs/common';

import type { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { AppException } from '../../common/errors/app-exception.js';
import { bySortOrder, nextSortOrder, publishedOnly, uniqueNames } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { type CacheTag, RevalidationService } from '../revalidation/revalidation.service.js';
import type {
  CreateTeamMemberDto,
  PublicTeamMemberDto,
  TeamMemberAdminDto,
  UpdateTeamMemberDto,
} from './dto/team-member.dto.js';
import {
  adminTeamMemberInclude,
  publicTeamMemberInclude,
  toAdminTeamMember,
  toPublicTeamMember,
} from './team.mapper.js';

/** Team members appear on the team page, project pages and in statistics. */
const AFFECTED_TAGS: CacheTag[] = ['team', 'projects', 'stats'];

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidation: RevalidationService,
  ) {}

  async listPublished(): Promise<PublicTeamMemberDto[]> {
    const members = await this.prisma.teamMember.findMany({
      where: publishedOnly,
      orderBy: bySortOrder,
      include: publicTeamMemberInclude,
    });
    return members.map(toPublicTeamMember);
  }

  async listForAdmin(query: AdminListQueryDto): Promise<TeamMemberAdminDto[]> {
    const members = await this.prisma.teamMember.findMany({
      where: {
        status: query.status ?? undefined,
        ...(query.search ? { OR: [{ name: { contains: query.search } }, { role: { contains: query.search } }] } : {}),
      },
      orderBy: bySortOrder,
      include: adminTeamMemberInclude,
    });
    return members.map(toAdminTeamMember);
  }

  async findOne(id: number): Promise<TeamMemberAdminDto> {
    const member = await this.prisma.teamMember.findUnique({ where: { id }, include: adminTeamMemberInclude });
    if (!member) throw AppException.notFound('Team member');
    return toAdminTeamMember(member);
  }

  async create(dto: CreateTeamMemberDto): Promise<TeamMemberAdminDto> {
    const { skills, socialLinks, ...fields } = dto;
    const max = await this.prisma.teamMember.aggregate({ _max: { sortOrder: true } });

    const member = await this.prisma.teamMember.create({
      data: {
        ...fields,
        sortOrder: nextSortOrder(max),
        skills: { create: skillRows(skills ?? []) },
        socialLinks: { create: (socialLinks ?? []).map((link, index) => ({ ...link, sortOrder: index })) },
      },
      include: adminTeamMemberInclude,
    });

    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminTeamMember(member);
  }

  async update(id: number, dto: UpdateTeamMemberDto): Promise<TeamMemberAdminDto> {
    await this.findOne(id);
    const { skills, socialLinks, ...fields } = dto;

    const member = await this.prisma.$transaction(async (tx) => {
      if (skills) {
        await tx.teamMemberSkill.deleteMany({ where: { teamMemberId: id } });
      }
      if (socialLinks) {
        await tx.socialLink.deleteMany({ where: { teamMemberId: id } });
      }
      return tx.teamMember.update({
        where: { id },
        data: {
          ...fields,
          ...(skills ? { skills: { create: skillRows(skills) } } : {}),
          ...(socialLinks
            ? { socialLinks: { create: socialLinks.map((link, index) => ({ ...link, sortOrder: index })) } }
            : {}),
        },
        include: adminTeamMemberInclude,
      });
    });

    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminTeamMember(member);
  }

  async remove(id: number): Promise<void> {
    const member = await this.prisma.teamMember.findUnique({
      where: { id },
      select: { _count: { select: { projects: true } } },
    });
    if (!member) throw AppException.notFound('Team member');
    if (member._count.projects > 0) {
      throw AppException.inUse('This team member is linked to projects. Archive the member instead of deleting.');
    }

    await this.prisma.teamMember.delete({ where: { id } });
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.teamMember.update({ where: { id }, data: { sortOrder: index } })),
    );
    this.revalidation.trigger(AFFECTED_TAGS);
  }
}

function skillRows(skills: string[]): Prisma.TeamMemberSkillCreateWithoutTeamMemberInput[] {
  return uniqueNames(skills).map((name, index) => ({ name, sortOrder: index }));
}
