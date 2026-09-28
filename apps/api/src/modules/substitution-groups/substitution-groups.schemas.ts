export const substitutionGroupParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^[0-9]+$' }
  },
  additionalProperties: false
} as const;

export const substitutionGroupFoodParamsSchema = {
  type: 'object',
  required: ['id', 'foodId'],
  properties: {
    id: { type: 'string', pattern: '^[0-9]+$' },
    foodId: { type: 'string', pattern: '^[0-9]+$' }
  },
  additionalProperties: false
} as const;

export const createSubstitutionGroupBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    description: { type: ['string', 'null'], maxLength: 1000 },
    isActive: { type: 'boolean', default: true }
  },
  additionalProperties: false
} as const;

export const updateSubstitutionGroupBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    description: { type: ['string', 'null'], maxLength: 1000 }
  },
  additionalProperties: false
} as const;

export const updateSubstitutionGroupStatusBodySchema = {
  type: 'object',
  required: ['isActive'],
  properties: {
    isActive: { type: 'boolean' }
  },
  additionalProperties: false
} as const;

export const addFoodToGroupBodySchema = {
  type: 'object',
  required: ['foodId'],
  properties: {
    foodId: { type: 'integer', minimum: 1 }
  },
  additionalProperties: false
} as const;
