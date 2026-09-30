import { fromDateOnly } from '../../common/utils/content.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ContentStatus } from '../../generated/prisma/enums.js';
import { publicClientWhere } from '../clients/clients.service.js';
import {
  publicTestimonialSelect,
  publicTestimonialWhere,
  toPublicTestimonial,
} from '../testimonials/testimonials.service.js';
import type { ProjectAdminDto, PublicProjectDetailDto, PublicProjectSummaryDto } from './dto/project-response.dto.js';

const orderBySort = [{ sortOrder: 'asc' as const }, { id: 'asc' as const }];

const technologiesSelect = {
  orderBy: { sortOrder: 'asc' },
  select: { technology: { select: { name: true, slug: true } } },
} satisfies Prisma.Project$technologiesArgs;

export const projectSummarySelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  category: true,
  coverImageUrl: true,
  phase: true,
  isFeatured: true,
  startDate: true,
  endDate: true,
  updatedAt: true,
  technologies: technologiesSelect,
} satisfies Prisma.ProjectSelect;

export const projectDetailInclude = {
  technologies: technologiesSelect,
  images: { orderBy: orderBySort, select: { url: true, alt: true, width: true, height: true } },
  features: { orderBy: orderBySort, select: { title: true, description: true } },
  members: {
    where: { teamMember: { status: ContentStatus.PUBLISHED } },
    orderBy: [{ sortOrder: 'asc' }, { teamMember: { sortOrder: 'asc' } }],
    select: {
      role: true,
      teamMember: { select: { slug: true, name: true, role: true, avatarUrl: true } },
    },
  },
  services: {
    where: { service: { status: ContentStatus.PUBLISHED } },
    orderBy: { service: { sortOrder: 'asc' } },
    select: { service: { select: { slug: true, title: true } } },
  },
  client: {
    select: { name: true, logoUrl: true, websiteUrl: true, industry: true, status: true, hasDisplayConsent: true },
  },
  testimonials: { where: publicTestimonialWhere, orderBy: orderBySort, select: publicTestimonialSelect },
  achievements: {
    where: { status: ContentStatus.PUBLISHED },
    orderBy: orderBySort,
    select: { title: true, highlight: true, date: true },
  },
} satisfies Prisma.ProjectInclude;

export const projectAdminInclude = {
  technologies: { orderBy: { sortOrder: 'asc' }, select: { technology: { select: { name: true } } } },
  images: { orderBy: orderBySort, select: { url: true, alt: true, width: true, height: true } },
  features: { orderBy: orderBySort, select: { title: true, description: true } },
  members: {
    orderBy: { sortOrder: 'asc' },
    select: { teamMemberId: true, role: true, teamMember: { select: { name: true } } },
  },
  services: { select: { service: { select: { id: true, title: true } } } },
  client: { select: { id: true, name: true } },
} satisfies Prisma.ProjectInclude;

type ProjectSummaryRecord = Prisma.ProjectGetPayload<{ select: typeof projectSummarySelect }>;
type ProjectDetailRecord = Prisma.ProjectGetPayload<{ include: typeof projectDetailInclude }>;
type ProjectAdminRecord = Prisma.ProjectGetPayload<{ include: typeof projectAdminInclude }>;

export function toPublicProjectSummary(project: ProjectSummaryRecord): PublicProjectSummaryDto {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    category: project.category,
    coverImageUrl: project.coverImageUrl,
    phase: project.phase,
    isFeatured: project.isFeatured,
    technologies: project.technologies.map((link) => link.technology),
    startDate: fromDateOnly(project.startDate),
    endDate: fromDateOnly(project.endDate),
    updatedAt: project.updatedAt,
  };
}

export function toPublicProjectDetail(
  project: ProjectDetailRecord,
  relatedProjects: PublicProjectSummaryDto[],
): PublicProjectDetailDto {
  const clientIsPublic =
    project.client?.status === publicClientWhere.status &&
    project.client.hasDisplayConsent === publicClientWhere.hasDisplayConsent;

  return {
    ...toPublicProjectSummary(project),
    description: project.description,
    problem: project.problem,
    solution: project.solution,
    ourRole: project.ourRole,
    results: project.results,
    liveUrl: project.liveUrl,
    repositoryUrl: project.repositoryUrl,
    seoTitle: project.seoTitle,
    seoDescription: project.seoDescription,
    ogImageUrl: project.ogImageUrl,
    publishedAt: project.publishedAt,
    createdAt: project.createdAt,
    images: project.images,
    features: project.features,
    members: project.members.map((link) => ({
      slug: link.teamMember.slug,
      name: link.teamMember.name,
      role: link.teamMember.role,
      contribution: link.role,
      avatarUrl: link.teamMember.avatarUrl,
    })),
    services: project.services.map((link) => link.service),
    client:
      project.client && clientIsPublic
        ? {
            name: project.client.name,
            logoUrl: project.client.logoUrl,
            websiteUrl: project.client.websiteUrl,
            industry: project.client.industry,
          }
        : null,
    testimonials: project.testimonials.map(toPublicTestimonial),
    achievements: project.achievements.map((achievement) => ({
      ...achievement,
      date: fromDateOnly(achievement.date),
    })),
    relatedProjects,
  };
}

export function toAdminProject(project: ProjectAdminRecord): ProjectAdminDto {
  const { technologies, members, services, startDate, endDate, ...fields } = project;
  return {
    ...fields,
    startDate: fromDateOnly(startDate),
    endDate: fromDateOnly(endDate),
    technologies: technologies.map((link) => link.technology.name),
    services: services.map((link) => link.service),
    members: members.map((member) => ({
      teamMemberId: member.teamMemberId,
      name: member.teamMember.name,
      role: member.role,
    })),
  };
}
