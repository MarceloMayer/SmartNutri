import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type { UserRole } from '../../auth/auth.types';
import type { CreateUserBody, UpdateUserBody, User, UserVisibilityScope } from './users.types';

type TimestampValue = Date | string;
type UserRow = RowDataPacket & Omit<User, 'createdAt' | 'updatedAt'> & {
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
};

interface CreateUserInput extends CreateUserBody {
  passwordHash: string;
}

export class UsersRepository {
  constructor(private readonly db: Pool) {}

  async list(scope: UserVisibilityScope): Promise<User[]> {
    if (scope.type === 'linked_patients') {
      const [rows] = await this.db.query<UserRow[]>(
        `
          SELECT DISTINCT
            users.id,
            users.name,
            users.email,
            users.role,
            users.status,
            users.created_at AS createdAt,
            users.updated_at AS updatedAt
          FROM users
          INNER JOIN patients
            ON patients.patient_user_id = users.id
          WHERE users.role = 'patient'
            AND patients.nutritionist_user_id = :nutritionistUserId
          ORDER BY users.name ASC
        `,
        { nutritionistUserId: scope.nutritionistUserId }
      );

      return rows.map(toUser);
    }

    const [rows] = await this.db.query<UserRow[]>(
        `
        SELECT
          id,
          name,
          email,
          role,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        ORDER BY name ASC
      `
    );

    return rows.map(toUser);
  }

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
      {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role
      }
    );

    const user = await this.findById(result.insertId);

    if (!user) {
      throw new Error('Created user was not found');
    }

    return user;
  }

  async linkPatientToNutritionistUser(
    nutritionistUserId: number,
    patientUserId: number,
    email: string
  ): Promise<boolean> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        UPDATE patients
        SET patient_user_id = :patientUserId
        WHERE nutritionist_user_id = :nutritionistUserId
          AND email = :email
          AND patient_user_id IS NULL
      `,
      {
        nutritionistUserId,
        patientUserId,
        email
      }
    );

    return result.affectedRows > 0;
  }

  async findById(id: number): Promise<User | null> {
    const [rows] = await this.db.query<UserRow[]>(
      `
        SELECT
          id,
          name,
          email,
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

    return rows[0] ? toUser(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await this.db.query<UserRow[]>(
      `
        SELECT
          id,
          name,
          email,
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

    return rows[0] ? toUser(rows[0]) : null;
  }

  async userIsVisibleToNutritionist(userId: number, nutritionistUserId: number): Promise<boolean> {
    const [rows] = await this.db.query<Array<RowDataPacket & { id: number }>>(
      `
        SELECT users.id
        FROM users
        INNER JOIN patients
          ON patients.patient_user_id = users.id
        WHERE users.id = :userId
          AND users.role = 'patient'
          AND patients.nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      {
        userId,
        nutritionistUserId
      }
    );

    return rows.length > 0;
  }

  async update(id: number, input: UpdateUserBody): Promise<User | null> {
    const fields: string[] = [];
    const params: Record<string, string | number> = { id };

    if (input.name !== undefined) {
      fields.push('name = :name');
      params.name = input.name;
    }

    if (input.email !== undefined) {
      fields.push('email = :email');
      params.email = input.email;
    }

    if (input.role !== undefined) {
      fields.push('role = :role');
      params.role = input.role;
    }

    if (input.status !== undefined) {
      fields.push('status = :status');
      params.status = input.status;
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    await this.db.query<ResultSetHeader>(
      `
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = :id
      `,
      params
    );

    return this.findById(id);
  }
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt)
  };
}

function toIsoString(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : value;
}
