import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { ProjectReferenceDto } from '../../../common/dto/reference.dto.js';
import { SocialLinkDto, SocialLinkInputDto } from '../../../common/dto/social-link.dto.js';
import { EmptyToNull, IsHttpUrl, IsSlug } from '../../../common/validation/decorators.js';
import { ContentStatus } from '../../../generated/prisma/enums.js';

export class CreateTeamMemberDto {
  /** Latin identifier used in URLs/anchors, e.g. `ahmad`. */
  @IsSlug(120)
  slug!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  /** Job title, e.g. "Software Engineer". */
  @IsString()
  @Length(2, 120)
  role!: string;

  /** e.g. "Frontend / Backend / AI". */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(191)
  specialization?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(5000)
  bio?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  avatarUrl?: string | null;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkInputDto)
  socialLinks?: SocialLinkInputDto[];
}

export class UpdateTeamMemberDto extends PartialType(CreateTeamMemberDto, { skipNullProperties: false }) {}

export class TeamMemberProjectDto extends ProjectReferenceDto {
  contribution!: string | null;
}

/** Public team member (GET /team). */
export class PublicTeamMemberDto {
  id!: number;
  slug!: string;
  name!: string;
  role!: string;
  specialization!: string | null;
  bio!: string | null;
  avatarUrl!: string | null;
  skills!: string[];
  socialLinks!: SocialLinkDto[];
  /** Published projects the member contributed to. */
  projects!: TeamMemberProjectDto[];
}

export class AdminTeamMemberProjectDto {
  id!: number;
  slug!: string;
  title!: string;
  status!: ContentStatus;
  contribution!: string | null;
}

export class TeamMemberAdminDto {
  id!: number;
  slug!: string;
  name!: string;
  role!: string;
  specialization!: string | null;
  bio!: string | null;
  avatarUrl!: string | null;
  status!: ContentStatus;
  sortOrder!: number;
  skills!: string[];
  socialLinks!: SocialLinkDto[];
  projects!: AdminTeamMemberProjectDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
