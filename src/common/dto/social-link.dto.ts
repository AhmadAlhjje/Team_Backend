import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { EmptyToNull, IsHttpUrl } from '../validation/decorators.js';
import { SocialPlatform } from '../../generated/prisma/enums.js';

export class SocialLinkInputDto {
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  /** @example https://github.com/team */
  @IsHttpUrl()
  url!: string;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(80)
  label?: string | null;
}

export class SocialLinkDto {
  platform!: SocialPlatform;
  url!: string;
  label!: string | null;
}
