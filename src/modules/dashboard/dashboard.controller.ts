import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardDto } from './dto/dashboard.dto.js';

@ApiTags('Admin · Dashboard')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @RequirePermissions()
  @ApiOperation({ summary: 'Content and inbox overview for the admin home page' })
  @ApiOkResponse({ type: DashboardDto })
  get(@CurrentUser() user: AuthUser): Promise<DashboardDto> {
    return this.dashboard.getSummary(user);
  }
}
