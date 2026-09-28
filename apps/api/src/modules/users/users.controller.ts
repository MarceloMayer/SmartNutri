import { hash } from 'bcrypt';

import type { AuthContext, UserRole } from '../../auth/auth.types';
import { UsersRepository } from './users.repository';
import type { CreateUserBody, UpdateUserBody, UserVisibilityScope } from './users.types';

const passwordSaltRounds = 12;

export class UsersController {
  constructor(private readonly usersRepository: UsersRepository) {}

  list(auth: AuthContext) {
    return this.usersRepository.list(resolveVisibilityScope(auth));
  }

  async create(auth: AuthContext, body: CreateUserBody) {
    if (!canCreateRole(auth.role, body.role)) {
      return {
        status: 'forbidden' as const,
        message: 'Forbidden'
      };
    }

    const email = normalizeEmail(body.email);
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      return {
        status: 'conflict' as const,
        message: 'Email already registered'
      };
    }

    const user = await this.usersRepository.create({
      name: body.name.trim(),
      email,
      password: body.password,
      passwordHash: await hash(body.password, passwordSaltRounds),
      role: body.role
    });

    if (auth.role === 'nutritionist' && body.role === 'patient') {
      await this.usersRepository.linkPatientToNutritionistUser(auth.userId, user.id, email);
    }

    return {
      status: 'created' as const,
      data: user
    };
  }

  async findById(auth: AuthContext, id: string) {
    const userId = Number(id);
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      return {
        status: 'not_found' as const,
        message: 'User not found'
      };
    }

    if (!await this.canAccessUser(auth, userId, user.role)) {
      return {
        status: 'forbidden' as const,
        message: 'Forbidden'
      };
    }

    return {
      status: 'ok' as const,
      data: user
    };
  }

  async update(auth: AuthContext, id: string, body: UpdateUserBody) {
    const userId = Number(id);
    const existingUser = await this.usersRepository.findById(userId);

    if (!existingUser) {
      return {
        status: 'not_found' as const,
        message: 'User not found'
      };
    }

    if (!await this.canAccessUser(auth, userId, existingUser.role)) {
      return {
        status: 'forbidden' as const,
        message: 'Forbidden'
      };
    }

    const nextRole = body.role ?? existingUser.role;

    if (!canUpdateToRole(auth.role, nextRole)) {
      return {
        status: 'forbidden' as const,
        message: 'Forbidden'
      };
    }

    const email = body.email === undefined ? undefined : normalizeEmail(body.email);

    if (email && email !== existingUser.email) {
      const userWithEmail = await this.usersRepository.findByEmail(email);

      if (userWithEmail && userWithEmail.id !== userId) {
        return {
          status: 'conflict' as const,
          message: 'Email already registered'
        };
      }
    }

    const user = await this.usersRepository.update(userId, {
      name: body.name?.trim(),
      email,
      role: body.role,
      status: body.status
    });

    return {
      status: 'ok' as const,
      data: user
    };
  }

  private async canAccessUser(auth: AuthContext, userId: number, role: UserRole): Promise<boolean> {
    if (auth.role === 'admin') {
      return true;
    }

    if (auth.role === 'nutritionist' && role === 'patient') {
      return this.usersRepository.userIsVisibleToNutritionist(userId, auth.userId);
    }

    return false;
  }
}

function resolveVisibilityScope(auth: AuthContext): UserVisibilityScope {
  if (auth.role === 'nutritionist') {
    return {
      type: 'linked_patients',
      nutritionistUserId: auth.userId
    };
  }

  return {
    type: 'all'
  };
}

function canCreateRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'admin') {
    return true;
  }

  return actorRole === 'nutritionist' && targetRole === 'patient';
}

function canUpdateToRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'admin') {
    return true;
  }

  return actorRole === 'nutritionist' && targetRole === 'patient';
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
