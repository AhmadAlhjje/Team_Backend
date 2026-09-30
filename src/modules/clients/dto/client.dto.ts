import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';

import { EmptyToNull, IsHttpUrl } from '../../../common/validation/decorators.js';
import { ContentStatus } from '../../../generated/prisma/enums.js';

export class CreateClientDto {
  @IsString()
  @Length(1, 150)
  name!: string;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  logoUrl?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsHttpUrl()
  websiteUrl?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(120)
  industry?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  /** The client agreed to be displayed on the website. Required to publish. */
  @IsOptional()
  @IsBoolean()
  hasDisplayConsent?: boolean;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class UpdateClientDto extends PartialType(CreateClientDto, { skipNullProperties: false }) {}

export class PublicClientDto {
  id!: number;
  name!: string;
  logoUrl!: string | null;
  websiteUrl!: string | null;
  industry!: string | null;
}

export class ClientAdminDto {
  id!: number;
  name!: string;
  logoUrl!: string | null;
  websiteUrl!: string | null;
  industry!: string | null;
  description!: string | null;
  hasDisplayConsent!: boolean;
  status!: ContentStatus;
  sortOrder!: number;
  projectCount!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
