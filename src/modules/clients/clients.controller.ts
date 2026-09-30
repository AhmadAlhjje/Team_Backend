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
import { ClientsService } from './clients.service.js';
import { ClientAdminDto, CreateClientDto, PublicClientDto, UpdateClientDto } from './dto/client.dto.js';

@ApiTags('Clients')
@Public()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Published clients that agreed to be displayed' })
  @ApiOkResponse({ type: PublicClientDto, isArray: true })
  list(): Promise<PublicClientDto[]> {
    return this.clients.listPublished();
  }
}

@ApiTags('Admin · Clients')
@Controller('admin/clients')
@RequirePermissions(Permission.ContentManage)
export class AdminClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @ApiOkResponse({ type: ClientAdminDto, isArray: true })
  list(@Query() query: AdminListQueryDto): Promise<ClientAdminDto[]> {
    return this.clients.listForAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ClientAdminDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ClientAdminDto> {
    return this.clients.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: ClientAdminDto })
  @ApiBadRequestResponse({ description: 'CONSENT_REQUIRED when publishing without consent' })
  create(@Body() dto: CreateClientDto): Promise<ClientAdminDto> {
    return this.clients.create(dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.clients.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ClientAdminDto })
  @ApiBadRequestResponse({ description: 'CONSENT_REQUIRED when publishing without consent' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto): Promise<ClientAdminDto> {
    return this.clients.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'IN_USE — client is linked to projects' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.clients.remove(id);
  }
}
