import { Injectable } from '@nestjs/common';

import type { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { AppException } from '../../common/errors/app-exception.js';
import { bySortOrder, nextSortOrder, publishedOnly } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ContentStatus } from '../../generated/prisma/enums.js';
import { type CacheTag, RevalidationService } from '../revalidation/revalidation.service.js';
import { TechnologiesService } from '../technologies/technologies.service.js';
import type { CreateServiceDto, PublicServiceDto, ServiceAdminDto, UpdateServiceDto } from './dto/service.dto.js';

const AFFECTED_TAGS: CacheTag[] = ['services', 'projects'];

const technologiesInclude = {
  orderBy: { sortOrder: 'asc' },
  select: { technology: { select: { name: true, slug: true } } },
} satisfies Prisma.Service$technologiesArgs;

const adminInclude = {
  technologies: technologiesInclude,
  _count: { select: { projects: true } },
} satisfies Prisma.ServiceInclude;

type AdminServiceRecord = Prisma.ServiceGetPayload<{ include: typeof adminInclude }>;

function toAdminService(service: AdminServiceRecord): ServiceAdminDto {
  const { technologies, _count, ...fields } = service;
  return {
    ...fields,
    technologies: technologies.map((link) => link.technology),
    projectCount: _count.projects,
  };
}

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly technologies: TechnologiesService,
    private readonly revalidation: RevalidationService,
  ) {}

  async listPublished(): Promise<PublicServiceDto[]> {
    const services = await this.prisma.service.findMany({
      where: publishedOnly,
      orderBy: bySortOrder,
      include: {
        technologies: technologiesInclude,
        projects: {
          where: { project: { status: ContentStatus.PUBLISHED } },
          orderBy: { project: { sortOrder: 'asc' } },
          select: { project: { select: { slug: true, title: true } } },
        },
      },
    });

    return services.map((service) => ({
      id: service.id,
      slug: service.slug,
      title: service.title,
      summary: service.summary,
      description: service.description,
      icon: service.icon,
      technologies: service.technologies.map((link) => link.technology),
      projects: service.projects.map((link) => link.project),
    }));
  }

  async listForAdmin(query: AdminListQueryDto): Promise<ServiceAdminDto[]> {
    const services = await this.prisma.service.findMany({
      where: {
        status: query.status ?? undefined,
        ...(query.search ? { title: { contains: query.search } } : {}),
      },
      orderBy: bySortOrder,
      include: adminInclude,
    });
    return services.map(toAdminService);
  }

  async findOne(id: number): Promise<ServiceAdminDto> {
    const service = await this.prisma.service.findUnique({ where: { id }, include: adminInclude });
    if (!service) throw AppException.notFound('Service');
    return toAdminService(service);
  }

  async create(dto: CreateServiceDto): Promise<ServiceAdminDto> {
    const { technologies, ...fields } = dto;
    const max = await this.prisma.service.aggregate({ _max: { sortOrder: true } });

    const service = await this.prisma.$transaction(async (tx) => {
      const technologyIds = await this.technologies.resolveIds(tx, technologies ?? []);
      return tx.service.create({
        data: {
          ...fields,
          sortOrder: nextSortOrder(max),
          technologies: { create: technologyIds.map((technologyId, index) => ({ technologyId, sortOrder: index })) },
        },
        include: adminInclude,
      });
    });

    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminService(service);
  }

  async update(id: number, dto: UpdateServiceDto): Promise<ServiceAdminDto> {
    await this.findOne(id);
    const { technologies, ...fields } = dto;

    const service = await this.prisma.$transaction(async (tx) => {
      if (technologies) {
        await tx.serviceTechnology.deleteMany({ where: { serviceId: id } });
        const technologyIds = await this.technologies.resolveIds(tx, technologies);
        await tx.serviceTechnology.createMany({
          data: technologyIds.map((technologyId, index) => ({ serviceId: id, technologyId, sortOrder: index })),
        });
      }
      return tx.service.update({ where: { id }, data: fields, include: adminInclude });
    });

    this.revalidation.trigger(AFFECTED_TAGS);
    return toAdminService(service);
  }

  /** Links to projects are removed with the service (projects themselves are kept). */
  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.service.delete({ where: { id } });
    this.revalidation.trigger(AFFECTED_TAGS);
  }

  async reorder(ids: number[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.service.update({ where: { id }, data: { sortOrder: index } })),
    );
    this.revalidation.trigger(AFFECTED_TAGS);
  }
}
