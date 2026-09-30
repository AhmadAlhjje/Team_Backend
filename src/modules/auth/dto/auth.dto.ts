import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

import { ToLowerCase } from '../../../common/validation/decorators.js';
import { Role } from '../../../generated/prisma/enums.js';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export class LoginDto {
  /** @example admin@example.com */
  @ToLowerCase()
  @IsEmail()
  @MaxLength(191)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @Length(32, 128)
  refreshToken!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  /** At least 12 characters. */
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}

export class AuthUserDto {
  id!: number;
  email!: string;
  name!: string;
  role!: Role;
  /** Permissions granted by the role (used by Admin to show/hide features). */
  permissions!: string[];
}

export class AuthSessionDto {
  accessToken!: string;
  accessTokenExpiresAt!: string;
  refreshToken!: string;
  refreshTokenExpiresAt!: string;
  user!: AuthUserDto;
}
