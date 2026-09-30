import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/permissions.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Admin · Users')
@Controller('admin/users')
@RequirePermissions(Permission.UsersManage)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List admin accounts' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  list(): Promise<UserResponseDto[]> {
    return this.users.list();
  }

  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an admin account' })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.users.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role, status, profile or reset the password' })
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.users.update(actor.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.users.remove(actor.id, id);
  }
}
