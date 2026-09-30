import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

import { ProjectReferenceDto } from '../../../common/dto/reference.dto.js';
import { EmptyToNull, IsDateOnly, IsHttpUrl } from '../../../common/validation/decorators.js';
import { AchievementType, ContentStatus } from '../../../generated/prisma/enums.js';

export class CreateAchievementDto {
  @IsString()
  @Length(2, 200)
  title!: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsEnum(AchievementType)
  type?: AchievementType;

  /** Organizer or issuing body. */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(150)
  issuer?: string | null;

  /** Short highlight such as a rank ("المركز الأول"). */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(120)
  highlight?: string | null;

  /** @example 2026-05-20 */
  @IsOptional()
  @EmptyToNull()
  @IsDateOnly()
  date?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  imageUrl?: string | null;

  /** Public proof: certificate, announcement or article. */
  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  proofUrl?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsInt()
  @Min(1)
  projectId?: number | null;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class UpdateAchievementDto extends PartialType(CreateAchievementDto, { skipNullProperties: false }) {}

export class PublicAchievementDto {
  id!: number;
  title!: string;
  description!: string | null;
  type!: AchievementType;
  issuer!: string | null;
  highlight!: string | null;
  /** YYYY-MM-DD */
  date!: string | null;
  imageUrl!: string | null;
  proofUrl!: string | null;
  project!: ProjectReferenceDto | null;
}

export class AchievementAdminProjectDto {
  id!: number;
  slug!: string;
  title!: string;
}

export class AchievementAdminDto {
  id!: number;
  title!: string;
  description!: string | null;
  type!: AchievementType;
  issuer!: string | null;
  highlight!: string | null;
  date!: string | null;
  imageUrl!: string | null;
  proofUrl!: string | null;
  projectId!: number | null;
  project!: AchievementAdminProjectDto | null;
  status!: ContentStatus;
  sortOrder!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
