import { HttpStatus, Injectable } from '@nestjs/common';

import type { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { AppException, ErrorCode } from '../../common/errors/app-exception.js';
import { bySortOrder, nextSortOrder, publishedOnly, toDateOnly } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ContentStatus } from '../../generated/prisma/enums.js';
import { type CacheTag, RevalidationService } from '../revalidation/revalidation.service.js';
import { TechnologiesService } from '../technologies/technologies.service.js';
import type { CreateProjectDto, PublicProjectsQueryDto, UpdateProjectDto } from './dto/project.dto.js';
import type { ProjectAdminDto, PublicProjectDetailDto, PublicProjectSummaryDto } from './dto/project-response.dto.js';
import {
  projectAdminInclude,
  projectDetailInclude,
  projectSummarySelect,
  toAdminProject,
  toPublicProjectDetail,
  toPublicProjectSummary,
} from './projects.mapper.js';

export const RELATED_PROJECTS_LIMIT = 3;

/** Projects are referenced from the team, services, testimonials, achievements and stats. */
const AFFECTED_TAGS: CacheTag[] = ['projects', 'team', 'services', 'testimonials', 'achievements', 'stats'];

type RelationInput = Pick<CreateProjectDto, 'technologies' | 'serviceIds' | 'members' | 'images' | 'features'>;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly technologies: TechnologiesService,
    private readonly revalidation: RevalidationService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------------

  async listPublished(query: PublicProjectsQueryDto): Promise<PublicProjectSummaryDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { ...publishedOnly, ...(query.featured ? { isFeatured: true } : {}) },
      orderBy: bySortOrder,
      take: query.limit,
      select: projectSummarySelect,
    });
    return projects.map(toPublicProjectSummary);
  }

  async findPublishedBySlug(slug: string): Promise<PublicProjectDetailDto> {
    const project = await this.prisma.project.findFirst({
      where: { slug, ...publishedOnly },
      include: projectDetailInclude,
    });
    if (!project) throw AppException.notFound('Project');

    const related = await this.findRelated(project.id);
    return toPublicProjectDetail(project, related);
  }

  /**
   * Related projects: published projects sharing a service or a technology,
   * topped up with other published projects when there are not enough.
   */
  private async findRelated(projectId: number): Promise<PublicProjectSummaryDto[]> {
    const source = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: {
        services: { select: { serviceId: true } },
        technologies: { select: { technologyId: true } },
      },
    });
    const serviceIds = source.services.map((link) => link.serviceId);
    const technologyIds = source.technologies.map((link) => link.technologyId);

    const similar = await this.prisma.project.findMany({
      where: {
        ...publishedOnly,
        id: { not: projectId },
        OR: [
          { services: { some: { serviceId: { in: serviceIds } } } },
          { technologies: { some: { technologyId: { in: technologyIds } } } },
        ],
      },
      orderBy: bySortOrder,
      take: RELATED_PROJECTS_LIMIT,
      select: projectSummarySelect,
    });

    const missing = RELATED_PROJECTS_LIMIT - similar.length;
    const others =
      missing > 0
        ? await this.prisma.project.findMany({
            where: { ...publishedOnly, id: { notIn: [projectId, ...similar.map((project) => project.id)] } },
            orderBy: bySortOrder,
            take: missing,
            select: projectSummarySelect,
          })
        : [];

    return [...similar, ...others].map(toPublicProjectSummary);
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async listForAdmin(query: AdminListQueryDto): Promise<ProjectAdminDto[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        status: query.status ?? undefined,
        ...(query.search ? { OR: [{ title: { contains: query.search } }, { slug: { contains: query.search } }] } : {}),
      },
      orderBy: bySortOrder,
      include: projectAdminInclude,
    });
    return projects.map(toAdminProject);
  }

  async findOne(id: number): Promise<ProjectAdminDto> {
    const project = await this.prisma.project.findUnique({ where: { id }, include: projectAdminInclude });
    if (!project) throw AppException.notFound('Project');
    return toAdminProject(project);
  }

  async create(dto: CreateProjectDto): Promise<ProjectAdminDto> {
    const { technologies, serviceIds, members, images, features, ...fields } = dto;
    this.assertDateRange(fields.startDate, fields.endDate);
    await this.assertReferences(dto);
    const max = await this.prisma.project.aggregate({ _max: { sortOrder: true } });

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          ...fields,
          startDate: toDateOnly(fields.startDate),
          endDate: toDateOnly(fields.endDate),
          sortOrder: nextSortOrder(max),
          publishedAt: fields.status === ContentStatus.PUBLISHED ? new Date() : null,
        },
      });
      await this.writeRelations(tx, created.id, { technologies, serviceIds, members, images, features });
      return tx.project.findUniqueOrThrow({ where: { id: created.id }, include: projectAdminInclude });
    });

    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminProject(project);
  }

  async update(id: number, dto: UpdateProjectDto): Promise<ProjectAdminDto> {
    const current = await this.prisma.project.findUnique({
      where: { id },
      select: { startDate: true, endDate: true, publishedAt: true },
    });
    if (!current) throw AppException.notFound('Project');

    const { technologies, serviceIds, members, images, features, ...fields } = dto;
    this.assertDateRange(
      fields.startDate !== undefined ? fields.startDate : current.startDate?.toISOString().slice(0, 10),
      fields.endDate !== undefined ? fields.endDate : current.endDate?.toISOString().slice(0, 10),
    );
    await this.assertReferences(dto);

    const project = await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          ...fields,
          startDate: toDateOnly(fields.startDate),
          endDate: toDateOnly(fields.endDate),
          ...(fields.status === ContentStatus.PUBLISHED && !current.publishedAt ? { publishedAt: new Date() } : {}),
        },
      });
      await this.writeRelations(tx, id, { technologies, serviceIds, members, images, features }, true);
      return tx.project.findUniqueOrThrow({ where: { id }, include: projectAdminInclude });
    });

    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminProject(project);
  }

  /**
   * Deletes a project with its images, features and links. Testimonials and
   * achievements are kept and simply unlinked. Prefer archiving.
   */
  async remove(id: number): Promise<void> {
    const exists = await this.prisma.project.count({ where: { id } });
    if (!exists) throw AppException.notFound('Project');
    await this.prisma.project.delete({ where: { id } });
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.project.update({ where: { id }, data: { sortOrder: index } })),
    );
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  /** Replaces relation sets that are present in the input (absent = unchanged). */
  private async writeRelations(
    tx: Prisma.TransactionClient,
    projectId: number,
    input: RelationInput,
    replace = false,
  ): Promise<void> {
    if (input.technologies) {
      if (replace) await tx.projectTechnology.deleteMany({ where: { projectId } });
      const technologyIds = await this.technologies.resolveIds(tx, input.technologies);
      await tx.projectTechnology.createMany({
        data: technologyIds.map((technologyId, index) => ({ projectId, technologyId, sortOrder: index })),
      });
    }

    if (input.serviceIds) {
      if (replace) await tx.projectService.deleteMany({ where: { projectId } });
      await tx.projectService.createMany({ data: input.serviceIds.map((serviceId) => ({ projectId, serviceId })) });
    }

    if (input.members) {
      if (replace) await tx.projectMember.deleteMany({ where: { projectId } });
      await tx.projectMember.createMany({
        data: input.members.map((member, index) => ({
          projectId,
          teamMemberId: member.teamMemberId,
          role: member.role ?? null,
          sortOrder: index,
        })),
      });
    }

    if (input.images) {
      if (replace) await tx.projectImage.deleteMany({ where: { projectId } });
      await tx.projectImage.createMany({
        data: input.images.map((image, index) => ({
          projectId,
          url: image.url,
          alt: image.alt ?? null,
          width: image.width ?? null,
          height: image.height ?? null,
          sortOrder: index,
        })),
      });
    }

    if (input.features) {
      if (replace) await tx.projectFeature.deleteMany({ where: { projectId } });
      await tx.projectFeature.createMany({
        data: input.features.map((feature, index) => ({
          projectId,
          title: feature.title,
          description: feature.description ?? null,
          sortOrder: index,
        })),
      });
    }
  }

  private assertDateRange(start: string | null | undefined, end: string | null | undefined): void {
    if (start && end && end < start) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.ValidationFailed, 'endDate must be after startDate', [
        { field: 'endDate', messages: ['endDate must be after startDate'] },
      ]);
    }
  }

  /** Validates referenced records up-front to return clear field errors. */
  private async assertReferences(dto: UpdateProjectDto): Promise<void> {
    if (dto.clientId) {
      const exists = await this.prisma.client.count({ where: { id: dto.clientId } });
      if (!exists) throw AppException.invalidReference('clientId', 'Client does not exist');
    }

    if (dto.serviceIds?.length) {
      const found = await this.prisma.service.count({ where: { id: { in: dto.serviceIds } } });
      if (found !== dto.serviceIds.length) {
        throw AppException.invalidReference('serviceIds', 'One or more services do not exist');
      }
    }

    if (dto.members?.length) {
      const memberIds = dto.members.map((member) => member.teamMemberId);
      if (new Set(memberIds).size !== memberIds.length) {
        throw AppException.invalidReference('members', 'A team member can only be added once');
      }
      const found = await this.prisma.teamMember.count({ where: { id: { in: memberIds } } });
      if (found !== memberIds.length) {
        throw AppException.invalidReference('members', 'One or more team members do not exist');
      }
    }
  }
}
