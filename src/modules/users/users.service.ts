import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException, ErrorCode } from '../../common/errors/app-exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Role } from '../../generated/prisma/enums.js';
import { PasswordService } from '../auth/password.service.js';
import { RefreshTokenService } from '../auth/refresh-token.service.js';
import type { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dto.js';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  list(): Promise<UserResponseDto[]> {
    return this.prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw AppException.notFound('User');
    return user;
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash: await this.passwords.hash(dto.password),
      },
      select: userSelect,
    });
  }

  async update(actorId: number, id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findOne(id);

    if (actorId === id && (dto.isActive === false || (dto.role && dto.role !== user.role))) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.SelfModification,
        'You cannot deactivate your own account or change your own role',
      );
    }

    const losesSuperAdmin =
      user.role === Role.SUPER_ADMIN &&
      user.isActive &&
      ((dto.role !== undefined && dto.role !== Role.SUPER_ADMIN) || dto.isActive === false);
    if (losesSuperAdmin) await this.assertAnotherActiveSuperAdmin(id);

    const passwordReset = dto.password !== undefined;
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        isActive: dto.isActive,
        ...(passwordReset
          ? { passwordHash: await this.passwords.hash(dto.password as string), passwordChangedAt: new Date() }
          : {}),
      },
      select: userSelect,
    });

    // End existing sessions when access is reduced or credentials change.
    if (passwordReset || dto.isActive === false) await this.refreshTokens.revokeAllForUser(id);

    return updated;
  }

  async remove(actorId: number, id: number): Promise<void> {
    if (actorId === id) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.SelfModification, 'You cannot delete your own account');
    }
    const user = await this.findOne(id);
    if (user.role === Role.SUPER_ADMIN && user.isActive) await this.assertAnotherActiveSuperAdmin(id);
    await this.prisma.user.delete({ where: { id } });
  }

  private async assertAnotherActiveSuperAdmin(excludedId: number): Promise<void> {
    const others = await this.prisma.user.count({
      where: { role: Role.SUPER_ADMIN, isActive: true, id: { not: excludedId } },
    });
    if (others === 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.LastSuperAdmin,
        'At least one active super admin must remain',
      );
    }
  }
}
