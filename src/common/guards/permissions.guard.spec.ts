import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppException } from '../errors/app-exception.js';
import { Permission, permissionsForRole, roleHasPermissions } from '../auth/permissions.js';
import { PermissionsGuard } from './permissions.guard.js';

function contextFor(user: unknown): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RBAC', () => {
  it('grants super admins every permission and restricts admins', () => {
    expect(permissionsForRole('SUPER_ADMIN')).toEqual(Object.values(Permission));
    expect(roleHasPermissions('ADMIN', [Permission.ContentManage, Permission.MessagesManage])).toBe(true);
    expect(roleHasPermissions('ADMIN', [Permission.UsersManage])).toBe(false);
    expect(roleHasPermissions('ADMIN', [Permission.SettingsManage])).toBe(false);
  });

  describe('PermissionsGuard', () => {
    const reflector = new Reflector();

    function guardRequiring(permissions: Permission[] | undefined, isPublic = false) {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
      vi.spyOn(reflector, 'getAllAndMerge').mockReturnValue(permissions as never);
      return new PermissionsGuard(reflector);
    }

    it('allows public routes and routes without requirements', () => {
      expect(guardRequiring([Permission.UsersManage], true).canActivate(contextFor(undefined))).toBe(true);
      expect(guardRequiring([]).canActivate(contextFor({ role: 'ADMIN' }))).toBe(true);
    });

    it('allows a role that has the permission', () => {
      expect(guardRequiring([Permission.ContentManage]).canActivate(contextFor({ role: 'ADMIN' }))).toBe(true);
    });

    it('rejects a role that lacks the permission', () => {
      expect(() => guardRequiring([Permission.UsersManage]).canActivate(contextFor({ role: 'ADMIN' }))).toThrow(
        AppException,
      );
    });
  });
});
