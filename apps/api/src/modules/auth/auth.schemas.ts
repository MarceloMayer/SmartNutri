export const registerUserBodySchema = {
  type: 'object',
  required: ['name', 'email', 'password'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    email: {
      type: 'string',
      minLength: 5,
      maxLength: 190,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    },
    password: { type: 'string', minLength: 6, maxLength: 128 }
  },
  additionalProperties: false
} as const;

export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      minLength: 5,
      maxLength: 190,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    },
    password: { type: 'string', minLength: 1, maxLength: 128 }
  },
  additionalProperties: false
} as const;

export const requestPasswordResetBodySchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      minLength: 5,
      maxLength: 190,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    }
  },
  additionalProperties: false
} as const;

export const resetPasswordBodySchema = {
  type: 'object',
  required: ['token', 'password'],
  properties: {
    token: { type: 'string', minLength: 32, maxLength: 256 },
    password: { type: 'string', minLength: 6, maxLength: 128 }
  },
  additionalProperties: false
} as const;

export const changePasswordBodySchema = {
  type: 'object',
  required: ['currentPassword', 'newPassword'],
  properties: {
    currentPassword: { type: 'string', minLength: 1, maxLength: 128 },
    newPassword: { type: 'string', minLength: 6, maxLength: 128 }
  },
  additionalProperties: false
} as const;
