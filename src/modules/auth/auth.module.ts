import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppConfigService } from '../../config/app-config.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { PasswordService } from './password.service.js';
import { RefreshTokenService } from './refresh-token.service.js';

export const JWT_ISSUER = 'team-platform-api';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { algorithm: 'HS256', issuer: JWT_ISSUER },
        verifyOptions: { algorithms: ['HS256'], issuer: JWT_ISSUER },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, RefreshTokenService, LoginAttemptsService],
  exports: [JwtModule, PasswordService, RefreshTokenService],
})
export class AuthModule {}
