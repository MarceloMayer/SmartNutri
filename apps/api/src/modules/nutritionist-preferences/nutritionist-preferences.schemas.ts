import { foodPreferenceTypes } from './nutritionist-preferences.types';

export const foodPreferenceParamsSchema = {
  type: 'object',
  required: ['foodId'],
  properties: {
    foodId: { type: 'string', pattern: '^[0-9]+$' }
  },
  additionalProperties: false
} as const;

export const blockedSubstitutionParamsSchema = {
  type: 'object',
  required: ['referenceFoodId', 'blockedFoodId'],
  properties: {
    referenceFoodId: { type: 'string', pattern: '^[0-9]+$' },
    blockedFoodId: { type: 'string', pattern: '^[0-9]+$' }
  },
  additionalProperties: false
} as const;

export const upsertFoodPreferenceBodySchema = {
  type: 'object',
  required: ['preferenceType'],
  properties: {
    preferenceType: { type: 'string', enum: [...foodPreferenceTypes] }
  },
  additionalProperties: false
} as const;

export const blockSubstitutionBodySchema = {
  type: 'object',
  required: ['referenceFoodId', 'blockedFoodId'],
  properties: {
    referenceFoodId: { type: 'integer', minimum: 1 },
    blockedFoodId: { type: 'integer', minimum: 1 }
  },
  additionalProperties: false
} as const;
