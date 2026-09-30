import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator.js';
import { PublicStatsDto } from './dto/stats.dto.js';
import { StatsService } from './stats.service.js';

@ApiTags('Stats')
@Public()
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Trust statistics computed from published content' })
  @ApiOkResponse({ type: PublicStatsDto })
  get(): Promise<PublicStatsDto> {
    return this.stats.getPublicStats();
  }
}
