import { ProjectReferenceDto, TechnologyReferenceDto } from '../../../common/dto/reference.dto.js';
import { ContentStatus, ProjectPhase } from '../../../generated/prisma/enums.js';
import { PublicTestimonialDto } from '../../testimonials/dto/testimonial.dto.js';

export class PublicProjectSummaryDto {
  id!: number;
  slug!: string;
  title!: string;
  summary!: string;
  category!: string | null;
  coverImageUrl!: string | null;
  phase!: ProjectPhase;
  isFeatured!: boolean;
  technologies!: TechnologyReferenceDto[];
  /** YYYY-MM-DD */
  startDate!: string | null;
  /** YYYY-MM-DD */
  endDate!: string | null;
  updatedAt!: Date;
}

export class ProjectImageDto {
  url!: string;
  alt!: string | null;
  width!: number | null;
  height!: number | null;
}

export class ProjectFeatureDto {
  title!: string;
  description!: string | null;
}

export class PublicProjectMemberDto {
  slug!: string;
  name!: string;
  /** Job title of the member. */
  role!: string;
  /** Contribution in this project. */
  contribution!: string | null;
  avatarUrl!: string | null;
}

export class PublicProjectClientDto {
  name!: string;
  logoUrl!: string | null;
  websiteUrl!: string | null;
  industry!: string | null;
}

export class ProjectAchievementDto {
  title!: string;
  highlight!: string | null;
  date!: string | null;
}

export class PublicProjectDetailDto extends PublicProjectSummaryDto {
  description!: string | null;
  problem!: string | null;
  solution!: string | null;
  ourRole!: string | null;
  results!: string | null;
  liveUrl!: string | null;
  repositoryUrl!: string | null;
  seoTitle!: string | null;
  seoDescription!: string | null;
  ogImageUrl!: string | null;
  publishedAt!: Date | null;
  createdAt!: Date;
  images!: ProjectImageDto[];
  features!: ProjectFeatureDto[];
  members!: PublicProjectMemberDto[];
  services!: ProjectReferenceDto[];
  /** Present only when the client agreed to be displayed. */
  client!: PublicProjectClientDto | null;
  testimonials!: PublicTestimonialDto[];
  achievements!: ProjectAchievementDto[];
  relatedProjects!: PublicProjectSummaryDto[];
}

export class ProjectAdminMemberDto {
  teamMemberId!: number;
  name!: string;
  role!: string | null;
}

export class ProjectAdminServiceDto {
  id!: number;
  title!: string;
}

export class ProjectAdminClientDto {
  id!: number;
  name!: string;
}

export class ProjectAdminDto {
  id!: number;
  slug!: string;
  title!: string;
  summary!: string;
  description!: string | null;
  problem!: string | null;
  solution!: string | null;
  ourRole!: string | null;
  results!: string | null;
  category!: string | null;
  coverImageUrl!: string | null;
  liveUrl!: string | null;
  repositoryUrl!: string | null;
  startDate!: string | null;
  endDate!: string | null;
  phase!: ProjectPhase;
  status!: ContentStatus;
  isFeatured!: boolean;
  sortOrder!: number;
  seoTitle!: string | null;
  seoDescription!: string | null;
  ogImageUrl!: string | null;
  publishedAt!: Date | null;
  clientId!: number | null;
  client!: ProjectAdminClientDto | null;
  technologies!: string[];
  services!: ProjectAdminServiceDto[];
  members!: ProjectAdminMemberDto[];
  images!: ProjectImageDto[];
  features!: ProjectFeatureDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
