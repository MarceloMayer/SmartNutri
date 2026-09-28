export const substitutionsQuerySchema = {
  type: 'object',
  properties: {
    sourceFoodId: { type: 'integer', minimum: 1 },
    groupId: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
  },
  additionalProperties: false
} as const;

export const calculateSubstitutionsBodySchema = {
  type: 'object',
  required: ['foodId', 'quantity'],
  properties: {
    foodId: { type: 'integer', minimum: 1 },
    quantity: { type: 'number', exclusiveMinimum: 0 },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
  },
  additionalProperties: false
} as const;
