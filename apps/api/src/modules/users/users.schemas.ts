import { userRoles, userStatuses } from '../../auth/auth.types';

export const userParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^[0-9]+$' }
  },
  additionalProperties: false
} as const;

export const createUserBodySchema = {
  type: 'object',
  required: ['name', 'email', 'password', 'role'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    email: {
      type: 'string',
      minLength: 5,
      maxLength: 190,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    },
    password: { type: 'string', minLength: 6, maxLength: 128 },
    role: { type: 'string', enum: [...userRoles] }
  },
  additionalProperties: false
} as const;

export const updateUserBodySchema = {
  type: 'object',
  minProperties: 1,
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    email: {
      type: 'string',
      minLength: 5,
      maxLength: 190,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    },
    role: { type: 'string', enum: [...userRoles] },
    status: { type: 'string', enum: [...userStatuses] }
  },
  additionalProperties: false
} as const;
