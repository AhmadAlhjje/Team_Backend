import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { EmptyToNull } from '../validation/decorators.js';
import { ContentStatus } from '../../generated/prisma/enums.js';

/** Filters shared by admin content lists. */
export class AdminListQueryDto {
  @IsOptional()
  @EmptyToNull()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(100)
  search?: string;
}
