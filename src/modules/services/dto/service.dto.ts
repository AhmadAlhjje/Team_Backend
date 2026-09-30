import { PartialType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

import { ProjectReferenceDto, TechnologyReferenceDto } from '../../../common/dto/reference.dto.js';
import { EmptyToNull, IsSlug } from '../../../common/validation/decorators.js';
import { ContentStatus } from '../../../generated/prisma/enums.js';

/** Icons available on the website (frontend/components/services/service-icon.tsx). */
export const SERVICE_ICONS = [
  'web',
  'mobile',
  'system',
  'desktop',
  'ai',
  'custom',
  'design',
  'cloud',
  'api',
  'consulting',
] as const;
export type ServiceIcon = (typeof SERVICE_ICONS)[number];

export class CreateServiceDto {
  @IsSlug(120)
  slug!: string;

  @IsString()
  @Length(2, 150)
  title!: string;

  /** One or two sentences shown on cards. */
  @IsString()
  @Length(10, 400)
  summary!: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @IsOptional()
  @IsIn(SERVICE_ICONS)
  icon?: ServiceIcon;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  /** Technology names, e.g. ["React", "NestJS"]. Unknown names are created. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  technologies?: string[];
}

export class UpdateServiceDto extends PartialType(CreateServiceDto, { skipNullProperties: false }) {}

export class PublicServiceDto {
  id!: number;
  slug!: string;
  title!: string;
  summary!: string;
  description!: string | null;
  icon!: string;
  technologies!: TechnologyReferenceDto[];
  /** Published projects delivered under this service. */
  projects!: ProjectReferenceDto[];
}

export class ServiceAdminDto {
  id!: number;
  slug!: string;
  title!: string;
  summary!: string;
  description!: string | null;
  icon!: string;
  status!: ContentStatus;
  sortOrder!: number;
  technologies!: TechnologyReferenceDto[];
  projectCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
