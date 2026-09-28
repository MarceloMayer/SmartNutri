import { randomBytes, createHash } from 'node:crypto';

import { compare, hash } from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../../config/env';
import { sendPasswordResetEmail } from '../../shared/mailer';
import { AuthRepository } from './auth.repository';
import type {
  AuthResponse,
  ChangePasswordBody,
  ChangePasswordResult,
  LoginBody,
  LoginResult,
  RegisterUserBody,
  RegisterUserResult,
  RequestPasswordResetResult,
  ResetPasswordResult,
  User,
  UserWithPassword
} from './auth.types';

const passwordSaltRounds = 12;
const passwordResetTokenBytes = 32;
const passwordResetTokenTtlMs = 60 * 60 * 1000;

export class AuthController {
  constructor(private readonly authRepository: AuthRepository) {}

  async register(body: RegisterUserBody): Promise<RegisterUserResult> {
    const email = normalizeEmail(body.email);
    // Public self-registration always creates a patient account. Nutritionist/admin
    // accounts can only be created by an authenticated admin via the /users module.
    const role = 'patient';

    const existingUser = await this.authRepository.findByEmail(email);

    if (existingUser) {
      return {
        status: 'conflict',
        message: 'Email already registered'
      };
    }

    const passwordHash = await hash(body.password, passwordSaltRounds);
    const user = await this.authRepository.create({
      name: body.name.trim(),
      email,
      passwordHash,
      role
    });

    return {
      status: 'created',
      data: this.buildAuthResponse(user)
    };
  }

  async login(body: LoginBody): Promise<LoginResult> {
    const user = await this.authRepository.findByEmail(normalizeEmail(body.email));

    if (!user || !await compare(body.password, user.passwordHash)) {
      return {
        status: 'invalid_credentials',
        message: 'Invalid email or password'
      };
    }

    if (user.status === 'inactive') {
      return {
        status: 'invalid_credentials',
        message: 'Invalid email or password'
      };
    }

    return {
      status: 'ok',
      data: this.buildAuthResponse(user)
    };
  }

  async me(userId: number): Promise<User | null> {
    const user = await this.authRepository.findById(userId);

    return user ? toUser(user) : null;
  }

  async requestPasswordReset(email: string): Promise<RequestPasswordResetResult> {
    const user = await this.authRepository.findByEmail(normalizeEmail(email));

    if (user && user.status !== 'inactive') {
      const rawToken = randomBytes(passwordResetTokenBytes).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + passwordResetTokenTtlMs);

      await this.authRepository.invalidateActivePasswordResetTokens(user.id);
      await this.authRepository.createPasswordResetToken(user.id, tokenHash, expiresAt);

      const resetUrl = `${env.webAppUrl}/redefinir-senha?token=${rawToken}`;

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (error) {
        console.error('Failed to send password reset email', error);
      }
    }

    return { status: 'ok' };
  }

  async resetPassword(body: { token: string; password: string }): Promise<ResetPasswordResult> {
    const tokenHash = hashResetToken(body.token);
    const resetToken = await this.authRepository.findValidPasswordResetToken(tokenHash);

    if (!resetToken) {
      return {
        status: 'invalid_token',
        message: 'This reset link is invalid or has expired'
      };
    }

    const passwordHash = await hash(body.password, passwordSaltRounds);

    await this.authRepository.updatePasswordHash(resetToken.userId, passwordHash);
    await this.authRepository.markPasswordResetTokenUsed(resetToken.id);
    await this.authRepository.invalidateActivePasswordResetTokens(resetToken.userId);

    return { status: 'ok' };
  }

  async changePassword(userId: number, body: ChangePasswordBody): Promise<ChangePasswordResult> {
    const user = await this.authRepository.findById(userId);

    if (!user || !await compare(body.currentPassword, user.passwordHash)) {
      return {
        status: 'invalid_current_password',
        message: 'Senha atual incorreta'
      };
    }

    const passwordHash = await hash(body.newPassword, passwordSaltRounds);

    await this.authRepository.updatePasswordHash(user.id, passwordHash);
    await this.authRepository.invalidateActivePasswordResetTokens(user.id);

    return { status: 'ok' };
  }

  private buildAuthResponse(user: User): AuthResponse {
    return {
      token: this.signToken(user),
      user: toUser(user)
    };
  }

  private signToken(user: User): string {
    return jwt.sign(
      {
        role: user.role
      },
      env.auth.jwtSecret,
      {
        subject: String(user.id),
        expiresIn: env.auth.jwtExpiresIn as SignOptions['expiresIn']
      }
    );
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function toUser(user: User | UserWithPassword): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
