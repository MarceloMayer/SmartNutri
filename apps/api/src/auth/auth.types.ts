export const userRoles = ['admin', 'nutritionist', 'patient'] as const;

export type UserRole = typeof userRoles[number];

export const userStatuses = ['active', 'inactive'] as const;

export type UserStatus = typeof userStatuses[number];

export interface AuthContext {
  userId: number;
  role: UserRole;
  roles: UserRole[];
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string'
    && (userRoles as readonly string[]).includes(value);
}

export function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === 'string'
    && (userStatuses as readonly string[]).includes(value);
}
