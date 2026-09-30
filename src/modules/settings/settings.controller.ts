import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permission } from '../../common/auth/permissions.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import {
  AdminSiteSettingsDto,
  PublicSiteSettingsDto,
  ReplaceProcessStepsDto,
  ReplaceSocialLinksDto,
  UpdateSiteSettingsDto,
} from './dto/settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Site settings, social links and "how we work" steps for the website' })
  @ApiOkResponse({ type: PublicSiteSettingsDto })
  getPublic(): Promise<PublicSiteSettingsDto> {
    return this.settings.get();
  }
}

@ApiTags('Admin · Settings')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequirePermissions()
  @ApiOkResponse({ type: AdminSiteSettingsDto })
  get(): Promise<AdminSiteSettingsDto> {
    return this.settings.get();
  }

  @Patch()
  @RequirePermissions(Permission.SettingsManage)
  @ApiOperation({ summary: 'Update site settings (partial)' })
  @ApiOkResponse({ type: AdminSiteSettingsDto })
  update(@Body() dto: UpdateSiteSettingsDto): Promise<AdminSiteSettingsDto> {
    return this.settings.update(dto);
  }

  @Put('social-links')
  @RequirePermissions(Permission.SettingsManage)
  @ApiOperation({ summary: 'Replace the site social links (order = array order)' })
  @ApiOkResponse({ type: AdminSiteSettingsDto })
  replaceSocialLinks(@Body() dto: ReplaceSocialLinksDto): Promise<AdminSiteSettingsDto> {
    return this.settings.replaceSocialLinks(dto);
  }

  @Put('process-steps')
  @RequirePermissions(Permission.SettingsManage)
  @ApiOperation({ summary: 'Replace the "how we work" steps (order = array order)' })
  @ApiOkResponse({ type: AdminSiteSettingsDto })
  replaceProcessSteps(@Body() dto: ReplaceProcessStepsDto): Promise<AdminSiteSettingsDto> {
    return this.settings.replaceProcessSteps(dto);
  }
}
