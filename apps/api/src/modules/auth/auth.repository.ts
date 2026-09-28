import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type { UserRole, UserStatus } from '../../auth/auth.types';
import type { User, UserWithPassword } from './auth.types';

type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type PasswordResetTokenRow = RowDataPacket & {
  id: number;
  userId: number;
  expiresAt: Date | string;
};

interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export class AuthRepository {
  constructor(private readonly db: Pool) {}

  async create(input: CreateUserInput): Promise<User> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO users (
          name,
          email,
          password_hash,
          role
        ) VALUES (
          :name,
          :email,
          :passwordHash,
          :role
        )
      `,
      { ...input }
    );

    const user = await this.findById(result.insertId);

    if (!user) {
      throw new Error('Created user was not found');
    }

    return toUser(user);
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const [rows] = await this.db.query<UserRow[]>(
      `
        SELECT
          id,
          name,
          email,
          password_hash AS passwordHash,
          role,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE email = :email
        LIMIT 1
      `,
      { email }
    );

    return rows[0] ? toUserWithPassword(rows[0]) : null;
  }

  async findById(id: number): Promise<UserWithPassword | null> {
    const [rows] = await this.db.query<UserRow[]>(
      `
        SELECT
          id,
          name,
          email,
          password_hash AS passwordHash,
          role,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE id = :id
        LIMIT 1
      `,
      { id }
    );

    return rows[0] ? toUserWithPassword(rows[0]) : null;
  }

  async updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET password_hash = :passwordHash WHERE id = :userId',
      { userId, passwordHash }
    );
  }

  async createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (:userId, :tokenHash, :expiresAt)
      `,
      { userId, tokenHash, expiresAt }
    );
  }

  async findValidPasswordResetToken(tokenHash: string): Promise<{ id: number; userId: number } | null> {
    const [rows] = await this.db.query<PasswordResetTokenRow[]>(
      `
        SELECT id, user_id AS userId, expires_at AS expiresAt
        FROM password_reset_tokens
        WHERE token_hash = :tokenHash
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      `,
      { tokenHash }
    );

    return rows[0] ? { id: rows[0].id, userId: rows[0].userId } : null;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await this.db.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = :id',
      { id }
    );
  }

  async invalidateActivePasswordResetTokens(userId: number): Promise<void> {
    await this.db.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = :userId
          AND used_at IS NULL
      `,
      { userId }
    );
  }
}

function toUserWithPassword(row: UserRow): UserWithPassword {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    status: row.status,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt)
  };
}

function toUser(user: UserWithPassword): User {
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

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
