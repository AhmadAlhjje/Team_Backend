import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Permission } from '../../common/auth/permissions.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { ReorderDto } from '../../common/dto/reorder.dto.js';
import { SlugPipe } from '../../common/pipes/slug.pipe.js';
import { CreateProjectDto, PublicProjectsQueryDto, UpdateProjectDto } from './dto/project.dto.js';
import { ProjectAdminDto, PublicProjectDetailDto, PublicProjectSummaryDto } from './dto/project-response.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('Projects')
@Public()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Published projects in display order' })
  @ApiOkResponse({ type: PublicProjectSummaryDto, isArray: true })
  list(@Query() query: PublicProjectsQueryDto): Promise<PublicProjectSummaryDto[]> {
    return this.projects.listPublished(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'A published project with its full case study' })
  @ApiOkResponse({ type: PublicProjectDetailDto })
  @ApiNotFoundResponse({ description: 'Unknown or unpublished project' })
  findOne(@Param('slug', SlugPipe) slug: string): Promise<PublicProjectDetailDto> {
    return this.projects.findPublishedBySlug(slug);
  }
}

@ApiTags('Admin · Projects')
@Controller('admin/projects')
@RequirePermissions(Permission.ContentManage)
export class AdminProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOkResponse({ type: ProjectAdminDto, isArray: true })
  list(@Query() query: AdminListQueryDto): Promise<ProjectAdminDto[]> {
    return this.projects.listForAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ProjectAdminDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ProjectAdminDto> {
    return this.projects.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: ProjectAdminDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED or INVALID_REFERENCE' })
  create(@Body() dto: CreateProjectDto): Promise<ProjectAdminDto> {
    return this.projects.create(dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.projects.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project. Relation arrays replace existing values when present.' })
  @ApiOkResponse({ type: ProjectAdminDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto): Promise<ProjectAdminDto> {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project permanently (prefer archiving)' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.projects.remove(id);
  }
}
