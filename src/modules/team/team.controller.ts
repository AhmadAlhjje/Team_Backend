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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Permission } from '../../common/auth/permissions.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { ReorderDto } from '../../common/dto/reorder.dto.js';
import {
  CreateTeamMemberDto,
  PublicTeamMemberDto,
  TeamMemberAdminDto,
  UpdateTeamMemberDto,
} from './dto/team-member.dto.js';
import { TeamService } from './team.service.js';

@ApiTags('Team')
@Public()
@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  @ApiOperation({ summary: 'Published team members in display order' })
  @ApiOkResponse({ type: PublicTeamMemberDto, isArray: true })
  list(): Promise<PublicTeamMemberDto[]> {
    return this.team.listPublished();
  }
}

@ApiTags('Admin · Team')
@Controller('admin/team')
@RequirePermissions(Permission.ContentManage)
export class AdminTeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  @ApiOkResponse({ type: TeamMemberAdminDto, isArray: true })
  list(@Query() query: AdminListQueryDto): Promise<TeamMemberAdminDto[]> {
    return this.team.listForAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: TeamMemberAdminDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TeamMemberAdminDto> {
    return this.team.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: TeamMemberAdminDto })
  create(@Body() dto: CreateTeamMemberDto): Promise<TeamMemberAdminDto> {
    return this.team.create(dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set display order (ids in order)' })
  @ApiNoContentResponse()
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.team.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a member. Arrays (skills, socialLinks) replace existing values.' })
  @ApiOkResponse({ type: TeamMemberAdminDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTeamMemberDto): Promise<TeamMemberAdminDto> {
    return this.team.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'IN_USE — member is linked to projects (archive instead)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.team.remove(id);
  }
}
