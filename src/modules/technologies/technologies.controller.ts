import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permission } from '../../common/auth/permissions.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { TechnologyResponseDto } from './dto/technology.dto.js';
import { TechnologiesService, type TechnologyDto } from './technologies.service.js';

@ApiTags('Admin · Technologies')
@Controller('admin/technologies')
@RequirePermissions(Permission.ContentManage)
export class TechnologiesController {
  constructor(private readonly technologies: TechnologiesService) {}

  @Get()
  @ApiOperation({ summary: 'All known technologies (for tag autocomplete)' })
  @ApiOkResponse({ type: TechnologyResponseDto, isArray: true })
  list(): Promise<TechnologyDto[]> {
    return this.technologies.list();
  }
}
