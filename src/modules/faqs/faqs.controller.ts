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
import { CreateFaqDto, FaqAdminDto, PublicFaqDto, UpdateFaqDto } from './dto/faq.dto.js';
import { FaqsService } from './faqs.service.js';

@ApiTags('FAQs')
@Public()
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqs: FaqsService) {}

  @Get()
  @ApiOperation({ summary: 'Published FAQs in display order' })
  @ApiOkResponse({ type: PublicFaqDto, isArray: true })
  list(): Promise<PublicFaqDto[]> {
    return this.faqs.listPublished();
  }
}

@ApiTags('Admin · FAQs')
@Controller('admin/faqs')
@RequirePermissions(Permission.ContentManage)
export class AdminFaqsController {
  constructor(private readonly faqs: FaqsService) {}

  @Get()
  @ApiOkResponse({ type: FaqAdminDto, isArray: true })
  list(@Query() query: AdminListQueryDto): Promise<FaqAdminDto[]> {
    return this.faqs.listForAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: FaqAdminDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<FaqAdminDto> {
    return this.faqs.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: FaqAdminDto })
  create(@Body() dto: CreateFaqDto): Promise<FaqAdminDto> {
    return this.faqs.create(dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.faqs.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOkResponse({ type: FaqAdminDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFaqDto): Promise<FaqAdminDto> {
    return this.faqs.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.faqs.remove(id);
  }
}
