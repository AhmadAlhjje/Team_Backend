import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { EmptyToNull, IsDateOnly, IsHttpUrl, IsSlug, ToBoolean, ToInt } from '../../../common/validation/decorators.js';
import { ContentStatus, ProjectPhase } from '../../../generated/prisma/enums.js';

const LONG_TEXT = 20_000;

export class ProjectImageInputDto {
  @IsHttpUrl()
  url!: string;

  /** Describes the screenshot for screen readers and SEO. */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(200)
  alt?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsInt()
  @Min(1)
  @Max(20_000)
  width?: number | null;

  @IsOptional()
  @EmptyToNull()
  @IsInt()
  @Min(1)
  @Max(20_000)
  height?: number | null;
}

export class ProjectFeatureInputDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class ProjectMemberInputDto {
  @IsInt()
  @Min(1)
  teamMemberId!: number;

  /** Contribution in this project, e.g. "Backend & API". */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(120)
  role?: string | null;
}

export class CreateProjectDto {
  /** Latin URL identifier: /projects/{slug}. */
  @IsSlug(160)
  slug!: string;

  @IsString()
  @Length(2, 160)
  title!: string;

  /** Short description for cards and meta tags. */
  @IsString()
  @Length(10, 400)
  summary!: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(LONG_TEXT)
  description?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(LONG_TEXT)
  problem?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(LONG_TEXT)
  solution?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(LONG_TEXT)
  ourRole?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(LONG_TEXT)
  results?: string | null;

  /** Card label, e.g. "تطبيق موبايل". */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  coverImageUrl?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  liveUrl?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  repositoryUrl?: string | null;

  /** @example 2026-01-15 */
  @IsOptional()
  @EmptyToNull()
  @IsDateOnly()
  startDate?: string | null;

  /** @example 2026-06-30 */
  @IsOptional()
  @EmptyToNull()
  @IsDateOnly()
  endDate?: string | null;

  @IsOptional()
  @IsEnum(ProjectPhase)
  phase?: ProjectPhase;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  /** Overrides the page title in search results (≈60 characters recommended). */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(120)
  seoTitle?: string | null;

  /** Overrides the meta description (≈155 characters recommended). */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(200)
  seoDescription?: string | null;

  /** Social sharing image (1200×630 recommended). Falls back to the cover image. */
  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  ogImageUrl?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsInt()
  @Min(1)
  clientId?: number | null;

  /** Technology names; unknown names are created. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  technologies?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  serviceIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberInputDto)
  members?: ProjectMemberInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProjectImageInputDto)
  images?: ProjectImageInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProjectFeatureInputDto)
  features?: ProjectFeatureInputDto[];
}

export class UpdateProjectDto extends PartialType(CreateProjectDto, { skipNullProperties: false }) {}

export class PublicProjectsQueryDto {
  /** Only featured projects. */
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @ToInt()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
