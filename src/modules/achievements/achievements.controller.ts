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
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permission } from '../../common/auth/permissions.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AdminListQueryDto } from '../../common/dto/admin-list-query.dto.js';
import { ReorderDto } from '../../common/dto/reorder.dto.js';
import { AchievementsService } from './achievements.service.js';
import {
  AchievementAdminDto,
  CreateAchievementDto,
  PublicAchievementDto,
  UpdateAchievementDto,
} from './dto/achievement.dto.js';

@ApiTags('Achievements')
@Public()
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Published achievements in display order' })
  @ApiOkResponse({ type: PublicAchievementDto, isArray: true })
  list(): Promise<PublicAchievementDto[]> {
    return this.achievements.listPublished();
  }
}

@ApiTags('Admin · Achievements')
@Controller('admin/achievements')
@RequirePermissions(Permission.ContentManage)
export class AdminAchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  @ApiOkResponse({ type: AchievementAdminDto, isArray: true })
  list(@Query() query: AdminListQueryDto): Promise<AchievementAdminDto[]> {
    return this.achievements.listForAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: AchievementAdminDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<AchievementAdminDto> {
    return this.achievements.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: AchievementAdminDto })
  create(@Body() dto: CreateAchievementDto): Promise<AchievementAdminDto> {
    return this.achievements.create(dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.achievements.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AchievementAdminDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAchievementDto): Promise<AchievementAdminDto> {
    return this.achievements.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.achievements.remove(id);
  }
}
