const idString = { type: 'string', pattern: '^[0-9]+$' } as const;
const nullableText = { type: ['string', 'null'], maxLength: 1000 } as const;
const nullableShortText = { type: ['string', 'null'], maxLength: 255 } as const;
const mealPlanStatus = {
  type: 'string',
  enum: ['draft', 'active', 'archived']
} as const;

export const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: idString
  },
  additionalProperties: false
} as const;

export const patientParamsSchema = idParamsSchema;

export const patientMealPlansParamsSchema = {
  type: 'object',
  required: ['patientId'],
  properties: {
    patientId: idString
  },
  additionalProperties: false
} as const;

export const mealPlanParamsSchema = {
  type: 'object',
  required: ['mealPlanId'],
  properties: {
    mealPlanId: idString
  },
  additionalProperties: false
} as const;

export const mealParamsSchema = {
  type: 'object',
  required: ['mealId'],
  properties: {
    mealId: idString
  },
  additionalProperties: false
} as const;

export const mealItemParamsSchema = {
  type: 'object',
  required: ['itemId'],
  properties: {
    itemId: idString
  },
  additionalProperties: false
} as const;

export const mealPlanItemSubstitutionParamsSchema = idParamsSchema;

const nullableSex = { type: ['string', 'null'], enum: ['male', 'female', null] } as const;
const nullableDate = { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const;

export const savePatientBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    email: {
      type: ['string', 'null'],
      maxLength: 190,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    },
    phone: { type: ['string', 'null'], maxLength: 40 },
    notes: nullableText,
    birthDate: nullableDate,
    sex: nullableSex,
    generateAccess: { type: 'boolean', default: false }
  },
  additionalProperties: false
} as const;

export const updatePatientBodySchema = {
  type: 'object',
  minProperties: 1,
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    email: {
      type: ['string', 'null'],
      maxLength: 190,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    },
    phone: { type: ['string', 'null'], maxLength: 40 },
    notes: nullableText,
    birthDate: nullableDate,
    sex: nullableSex
  },
  additionalProperties: false
} as const;

export const createMealPlanBodySchema = {
  type: 'object',
  required: ['title'],
  properties: {
    patientId: { type: ['integer', 'null'], minimum: 1 },
    title: { type: 'string', minLength: 2, maxLength: 160 },
    objective: nullableShortText,
    description: nullableText,
    status: { ...mealPlanStatus, default: 'draft' },
    isActive: { type: 'boolean' }
  },
  additionalProperties: false
} as const;

export const updateMealPlanBodySchema = {
  type: 'object',
  minProperties: 1,
  properties: {
    patientId: { type: ['integer', 'null'], minimum: 1 },
    title: { type: 'string', minLength: 2, maxLength: 160 },
    objective: nullableShortText,
    description: nullableText,
    status: mealPlanStatus,
    isActive: { type: 'boolean' }
  },
  additionalProperties: false
} as const;

export const createMealBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    timeLabel: { type: ['string', 'null'], maxLength: 40 },
    orderIndex: { type: 'integer', minimum: 0, default: 0 }
  },
  additionalProperties: false
} as const;

export const updateMealBodySchema = {
  type: 'object',
  minProperties: 1,
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 160 },
    timeLabel: { type: ['string', 'null'], maxLength: 40 },
    orderIndex: { type: 'integer', minimum: 0 }
  },
  additionalProperties: false
} as const;

export const createMealPlanItemBodySchema = {
  type: 'object',
  required: ['foodId', 'quantity'],
  properties: {
    foodId: { type: 'integer', minimum: 1 },
    quantity: { type: 'number', exclusiveMinimum: 0 },
    unit: { type: 'string', minLength: 1, maxLength: 40, default: 'g' },
    notes: nullableText,
    orderIndex: { type: 'integer', minimum: 0, default: 0 }
  },
  additionalProperties: false
} as const;

export const updateMealPlanItemBodySchema = {
  type: 'object',
  minProperties: 1,
  properties: {
    foodId: { type: 'integer', minimum: 1 },
    quantity: { type: 'number', exclusiveMinimum: 0 },
    unit: { type: 'string', minLength: 1, maxLength: 40 },
    notes: nullableText,
    orderIndex: { type: 'integer', minimum: 0 }
  },
  additionalProperties: false
} as const;
