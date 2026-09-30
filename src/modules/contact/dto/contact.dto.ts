import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

import { EmptyToNull, ToInt, ToLowerCase } from '../../../common/validation/decorators.js';
import { MessageStatus } from '../../../generated/prisma/enums.js';
import { PHONE_PATTERN } from '../../settings/dto/settings.dto.js';

export class CreateContactMessageDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @ToLowerCase()
  @IsEmail()
  @MaxLength(191)
  email!: string;

  @IsOptional()
  @EmptyToNull()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(150)
  company?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(120)
  projectType?: string | null;

  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(80)
  budget?: string | null;

  @IsString()
  @Length(20, 5000)
  message!: string;

  /** Honeypot field. Humans never see it; it must stay empty. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  /** Milliseconds between rendering the form and submitting it. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  elapsedMs?: number;
}

export class ContactSubmissionResponseDto {
  success!: true;
}

export class ListContactMessagesQueryDto {
  @IsOptional()
  @EmptyToNull()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  /** Matches name, email or company. */
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @ToInt()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @ToInt()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class UpdateContactMessageDto {
  @IsEnum(MessageStatus)
  status!: MessageStatus;
}

export class ContactMessageAdminDto {
  id!: number;
  name!: string;
  email!: string;
  phone!: string | null;
  company!: string | null;
  projectType!: string | null;
  budget!: string | null;
  message!: string;
  status!: MessageStatus;
  readAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ContactMessagePageDto {
  items!: ContactMessageAdminDto[];
  total!: number;
  page!: number;
  pageSize!: number;
  unreadCount!: number;
}
