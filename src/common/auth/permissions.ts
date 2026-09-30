import { Role } from '../../generated/prisma/enums.js';

/**
 * Role-Based Access Control.
 *
 * Endpoints require permissions, never roles. To add a role:
 *   1. add it to `enum Role` in prisma/schema.prisma and create a migration
 *   2. map it to its permissions below
 * No controller changes are needed.
 */
export const Permission = {
  /** Create/update/delete website content (team, projects, services, ...). */
  ContentManage: 'content:manage',
  /** Read and manage contact messages. */
  MessagesManage: 'messages:manage',
  /** Upload images. */
  MediaUpload: 'media:upload',
  /** Edit site-wide settings (name, logo, contact info, homepage texts). */
  SettingsManage: 'settings:manage',
  /** Manage admin accounts and roles. */
  UsersManage: 'users:manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.ADMIN]: [Permission.ContentManage, Permission.MessagesManage, Permission.MediaUpload],
};

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermissions(role: Role, required: readonly Permission[]): boolean {
  const granted = permissionsForRole(role);
  return required.every((permission) => granted.includes(permission));
}
