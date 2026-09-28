import type { UserRole, UserStatus } from '../../auth/auth.types';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserParams {
  id: string;
}

export interface CreateUserBody {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserBody {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export type UserVisibilityScope =
  | {
      type: 'all';
    }
  | {
      type: 'linked_patients';
      nutritionistUserId: number;
    };
