import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { UserAgent } from '../../common/decorators/user-agent.decorator.js';
import { AuthService } from './auth.service.js';
import { AuthSessionDto, AuthUserDto, ChangePasswordDto, LoginDto, RefreshTokenDto } from './dto/auth.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_CREDENTIALS' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit or account lockout' })
  login(@Body() dto: LoginDto, @UserAgent() userAgent?: string): Promise<AuthSessionDto> {
    return this.auth.login(dto, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a refresh token for a new session (rotates the refresh token)' })
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiUnauthorizedResponse({ description: 'INVALID_REFRESH_TOKEN' })
  refresh(@Body() dto: RefreshTokenDto, @UserAgent() userAgent?: string): Promise<AuthSessionDto> {
    return this.auth.refresh(dto.refreshToken, userAgent);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the session of a refresh token' })
  @ApiNoContentResponse()
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @RequirePermissions()
  @ApiOperation({ summary: 'Current admin profile and permissions' })
  @ApiOkResponse({ type: AuthUserDto })
  me(@CurrentUser() user: AuthUser): Promise<AuthUserDto> {
    return this.auth.getProfile(user.id);
  }

  @Patch('password')
  @RequirePermissions()
  @ApiOperation({ summary: 'Change own password (ends all other sessions)' })
  @ApiOkResponse({ type: AuthSessionDto })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @UserAgent() userAgent?: string,
  ): Promise<AuthSessionDto> {
    return this.auth.changePassword(user.id, dto, userAgent);
  }
}
