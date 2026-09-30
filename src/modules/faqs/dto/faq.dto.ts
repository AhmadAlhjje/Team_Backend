import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { ContentStatus } from '../../../generated/prisma/enums.js';

export class CreateFaqDto {
  @IsString()
  @Length(5, 300)
  question!: string;

  @IsString()
  @Length(5, 5000)
  answer!: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto, { skipNullProperties: false }) {}

export class PublicFaqDto {
  id!: number;
  question!: string;
  answer!: string;
}

export class FaqAdminDto {
  id!: number;
  question!: string;
  answer!: string;
  status!: ContentStatus;
  sortOrder!: number;
  createdAt!: Date;
  updatedAt!: Date;
}
