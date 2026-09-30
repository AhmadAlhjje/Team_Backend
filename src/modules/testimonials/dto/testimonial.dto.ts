import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

import { ProjectReferenceDto } from '../../../common/dto/reference.dto.js';
import { EmptyToNull, IsHttpUrl } from '../../../common/validation/decorators.js';
import { ContentStatus } from '../../../generated/prisma/enums.js';

export class CreateTestimonialDto {
  @IsString()
  @Length(2, 120)
  authorName!: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(120)
  authorTitle?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(150)
  company?: string | null;

  @IsString()
  @Length(10, 3000)
  content!: string;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  avatarUrl?: string | null;

  /** The client agreed to publish this testimonial. Required to publish. */
  @IsOptional()
  @IsBoolean()
  hasDisplayConsent?: boolean;

  @IsOptional()
  @EmptyToNull()
  @IsInt()
  @Min(1)
  projectId?: number | null;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class UpdateTestimonialDto extends PartialType(CreateTestimonialDto, { skipNullProperties: false }) {}

export class PublicTestimonialDto {
  id!: number;
  authorName!: string;
  authorTitle!: string | null;
  company!: string | null;
  content!: string;
  avatarUrl!: string | null;
  project!: ProjectReferenceDto | null;
}

export class TestimonialAdminProjectDto {
  id!: number;
  slug!: string;
  title!: string;
}

export class TestimonialAdminDto {
  id!: number;
  authorName!: string;
  authorTitle!: string | null;
  company!: string | null;
  content!: string;
  avatarUrl!: string | null;
  hasDisplayConsent!: boolean;
  projectId!: number | null;
  project!: TestimonialAdminProjectDto | null;
  status!: ContentStatus;
  sortOrder!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
