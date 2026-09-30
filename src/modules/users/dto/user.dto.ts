import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { ToLowerCase } from '../../../common/validation/decorators.js';
import { Role } from '../../../generated/prisma/enums.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../auth/dto/auth.dto.js';

export class CreateUserDto {
  @ToLowerCase()
  @IsEmail()
  @MaxLength(191)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /** Initial password (at least 12 characters). Share it securely and ask the user to change it. */
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserResponseDto {
  id!: number;
  email!: string;
  name!: string;
  role!: Role;
  isActive!: boolean;
  lastLoginAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}
