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
import { CreateServiceDto, PublicServiceDto, ServiceAdminDto, UpdateServiceDto } from './dto/service.dto.js';
import { ServicesService } from './services.service.js';

@ApiTags('Services')
@Public()
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Published services in display order' })
  @ApiOkResponse({ type: PublicServiceDto, isArray: true })
  list(): Promise<PublicServiceDto[]> {
    return this.services.listPublished();
  }
}

@ApiTags('Admin · Services')
@Controller('admin/services')
@RequirePermissions(Permission.ContentManage)
export class AdminServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @ApiOkResponse({ type: ServiceAdminDto, isArray: true })
  list(@Query() query: AdminListQueryDto): Promise<ServiceAdminDto[]> {
    return this.services.listForAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ServiceAdminDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ServiceAdminDto> {
    return this.services.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: ServiceAdminDto })
  create(@Body() dto: CreateServiceDto): Promise<ServiceAdminDto> {
    return this.services.create(dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.services.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ServiceAdminDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServiceDto): Promise<ServiceAdminDto> {
    return this.services.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.services.remove(id);
  }
}
