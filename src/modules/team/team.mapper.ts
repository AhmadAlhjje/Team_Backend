import type { Prisma } from '../../generated/prisma/client.js';
import { ContentStatus } from '../../generated/prisma/enums.js';
import type { PublicTeamMemberDto, TeamMemberAdminDto } from './dto/team-member.dto.js';

const socialLinkSelect = { platform: true, url: true, label: true } as const;
const orderBySort = [{ sortOrder: 'asc' as const }, { id: 'asc' as const }];

export const publicTeamMemberInclude = {
  skills: { orderBy: orderBySort, select: { name: true } },
  socialLinks: { orderBy: orderBySort, select: socialLinkSelect },
  projects: {
    where: { project: { status: ContentStatus.PUBLISHED } },
    orderBy: { project: { sortOrder: 'asc' } },
    select: { role: true, project: { select: { slug: true, title: true } } },
  },
} satisfies Prisma.TeamMemberInclude;

export const adminTeamMemberInclude = {
  skills: { orderBy: orderBySort, select: { name: true } },
  socialLinks: { orderBy: orderBySort, select: socialLinkSelect },
  projects: {
    orderBy: { project: { sortOrder: 'asc' } },
    select: { role: true, project: { select: { id: true, slug: true, title: true, status: true } } },
  },
} satisfies Prisma.TeamMemberInclude;

type PublicTeamMemberRecord = Prisma.TeamMemberGetPayload<{ include: typeof publicTeamMemberInclude }>;
type AdminTeamMemberRecord = Prisma.TeamMemberGetPayload<{ include: typeof adminTeamMemberInclude }>;

export function toPublicTeamMember(member: PublicTeamMemberRecord): PublicTeamMemberDto {
  return {
    id: member.id,
    slug: member.slug,
    name: member.name,
    role: member.role,
    specialization: member.specialization,
    bio: member.bio,
    avatarUrl: member.avatarUrl,
    skills: member.skills.map((skill) => skill.name),
    socialLinks: member.socialLinks,
    projects: member.projects.map((link) => ({
      slug: link.project.slug,
      title: link.project.title,
      contribution: link.role,
    })),
  };
}

export function toAdminTeamMember(member: AdminTeamMemberRecord): TeamMemberAdminDto {
  return {
    id: member.id,
    slug: member.slug,
    name: member.name,
    role: member.role,
    specialization: member.specialization,
    bio: member.bio,
    avatarUrl: member.avatarUrl,
    status: member.status,
    sortOrder: member.sortOrder,
    skills: member.skills.map((skill) => skill.name),
    socialLinks: member.socialLinks,
    projects: member.projects.map((link) => ({ ...link.project, contribution: link.role })),
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}
