export const foodAliasesQuerySchema = {
  type: 'object',
  properties: {
    foodId: { type: 'integer', minimum: 1 },
    q: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
  },
  additionalProperties: false
} as const;
