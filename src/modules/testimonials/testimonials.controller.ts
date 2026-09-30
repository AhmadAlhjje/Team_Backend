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
  CreateTestimonialDto,
  PublicTestimonialDto,
  TestimonialAdminDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto.js';
import { TestimonialsService } from './testimonials.service.js';

@ApiTags('Testimonials')
@Public()
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  @ApiOperation({ summary: 'Published testimonials with client consent' })
  @ApiOkResponse({ type: PublicTestimonialDto, isArray: true })
  list(): Promise<PublicTestimonialDto[]> {
    return this.testimonials.listPublished();
  }
}

@ApiTags('Admin · Testimonials')
@Controller('admin/testimonials')
@RequirePermissions(Permission.ContentManage)
export class AdminTestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  @ApiOkResponse({ type: TestimonialAdminDto, isArray: true })
  list(@Query() query: AdminListQueryDto): Promise<TestimonialAdminDto[]> {
    return this.testimonials.listForAdmin(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: TestimonialAdminDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TestimonialAdminDto> {
    return this.testimonials.findOne(id);
  }

  @Post()
  @ApiCreatedResponse({ type: TestimonialAdminDto })
  @ApiBadRequestResponse({ description: 'CONSENT_REQUIRED or INVALID_REFERENCE' })
  create(@Body() dto: CreateTestimonialDto): Promise<TestimonialAdminDto> {
    return this.testimonials.create(dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.testimonials.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TestimonialAdminDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTestimonialDto): Promise<TestimonialAdminDto> {
    return this.testimonials.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.testimonials.remove(id);
  }
}
