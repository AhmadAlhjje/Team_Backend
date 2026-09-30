import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../../common/decorators/public.decorator.js';
import { AppException, ErrorCode } from '../../common/errors/app-exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import { HealthResponseDto } from './dto/health.dto.js';

@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness + database connectivity (for load balancers and uptime monitors)' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Database unreachable' })
  async check(): Promise<HealthResponseDto> {
    if (!(await this.prisma.isHealthy())) {
      throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.ServiceUnavailable, 'Database unavailable');
    }
    return { status: 'ok', database: 'up', uptimeSeconds: Math.round(process.uptime()) };
  }
}
