export const foodListQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 }
  },
  additionalProperties: false
} as const;

export const foodSearchQuerySchema = {
  type: 'object',
  properties: {
    q: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 10, default: 10 }
  },
  additionalProperties: false
} as const;

export const foodParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^[0-9]+$' }
  },
  additionalProperties: false
} as const;
