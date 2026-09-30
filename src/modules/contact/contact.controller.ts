import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Permission } from '../../common/auth/permissions.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { UserAgent } from '../../common/decorators/user-agent.decorator.js';
import { ContactService } from './contact.service.js';
import {
  ContactMessageAdminDto,
  ContactMessagePageDto,
  ContactSubmissionResponseDto,
  CreateContactMessageDto,
  ListContactMessagesQueryDto,
  UpdateContactMessageDto,
} from './dto/contact.dto.js';

/** Per-IP limit for the public contact form. */
export const CONTACT_THROTTLE = { limit: 5, ttl: 10 * 60_000 };

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post()
  @Throttle({ default: CONTACT_THROTTLE })
  @ApiOperation({ summary: 'Submit a project inquiry from the website contact form' })
  @ApiCreatedResponse({ type: ContactSubmissionResponseDto })
  @ApiTooManyRequestsResponse({ description: 'More than 5 submissions per 10 minutes from one IP' })
  submit(
    @Body() dto: CreateContactMessageDto,
    @Ip() ip: string,
    @UserAgent() userAgent?: string,
  ): Promise<{ success: true }> {
    return this.contact.submit(dto, { ip, userAgent });
  }
}

@ApiTags('Admin · Contact messages')
@Controller('admin/contact-messages')
@RequirePermissions(Permission.MessagesManage)
export class AdminContactController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated inbox (newest first)' })
  @ApiOkResponse({ type: ContactMessagePageDto })
  list(@Query() query: ListContactMessagesQueryDto): Promise<ContactMessagePageDto> {
    return this.contact.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ContactMessageAdminDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ContactMessageAdminDto> {
    return this.contact.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mark as read / unread / archived' })
  @ApiOkResponse({ type: ContactMessageAdminDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactMessageDto): Promise<ContactMessageAdminDto> {
    return this.contact.updateStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contact.remove(id);
  }
}
