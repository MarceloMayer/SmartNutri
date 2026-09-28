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

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface RegisterUserBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RequestPasswordResetBody {
  email: string;
}

export interface ResetPasswordBody {
  token: string;
  password: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export type RegisterUserResult =
  | {
      status: 'created';
      data: AuthResponse;
    }
  | {
      status: 'conflict';
      message: string;
    };

export type LoginResult =
  | {
      status: 'ok';
      data: AuthResponse;
    }
  | {
      status: 'invalid_credentials';
      message: string;
    };

export type RequestPasswordResetResult = {
  status: 'ok';
};

export type ResetPasswordResult =
  | {
      status: 'ok';
    }
  | {
      status: 'invalid_token';
      message: string;
    };

export type ChangePasswordResult =
  | {
      status: 'ok';
    }
  | {
      status: 'invalid_current_password';
      message: string;
    };
