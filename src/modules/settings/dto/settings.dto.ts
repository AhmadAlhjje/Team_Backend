import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { SocialLinkDto, SocialLinkInputDto } from '../../../common/dto/social-link.dto.js';
import { EmptyToNull, IsHttpUrl } from '../../../common/validation/decorators.js';

export const PHONE_PATTERN = /^\+?[\d\s()-]{6,40}$/;

export class UpdateSiteSettingsDto {
  /** Team / brand name. Required once set. */
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  siteName?: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(200)
  tagline?: string | null;

  /** Default meta description of the website. */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  logoUrl?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsEmail()
  @MaxLength(191)
  email?: string | null;

  @IsOptional()
  @EmptyToNull()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string | null;

  @IsOptional()
  @EmptyToNull()
  @Matches(PHONE_PATTERN, { message: 'whatsapp must be a valid phone number' })
  whatsapp?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(200)
  heroTitle?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(500)
  heroSubtitle?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(200)
  aboutTitle?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(1000)
  aboutSummary?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(20000)
  aboutContent?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(200)
  ctaTitle?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(500)
  ctaSubtitle?: string | null;

  /** Year the team started. Used for "years of experience"; leave empty to hide it. */
  @IsOptional()
  @EmptyToNull()
  @IsInt()
  @Min(1990)
  @Max(2100)
  foundedYear?: number | null;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  defaultOgImageUrl?: string | null;
}

export class ReplaceSocialLinksDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkInputDto)
  links!: SocialLinkInputDto[];
}

export class ProcessStepInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class ReplaceProcessStepsDto {
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ProcessStepInputDto)
  steps!: ProcessStepInputDto[];
}

export class ProcessStepDto {
  title!: string;
  description!: string | null;
}

/** Public site settings (GET /settings/public). */
export class PublicSiteSettingsDto {
  siteName!: string;
  tagline!: string | null;
  description!: string | null;
  logoUrl!: string | null;
  email!: string | null;
  phone!: string | null;
  whatsapp!: string | null;
  location!: string | null;
  heroTitle!: string | null;
  heroSubtitle!: string | null;
  aboutTitle!: string | null;
  aboutSummary!: string | null;
  aboutContent!: string | null;
  ctaTitle!: string | null;
  ctaSubtitle!: string | null;
  foundedYear!: number | null;
  defaultOgImageUrl!: string | null;
  socialLinks!: SocialLinkDto[];
  processSteps!: ProcessStepDto[];
  updatedAt!: Date;
}

export class AdminSiteSettingsDto extends PublicSiteSettingsDto {}
