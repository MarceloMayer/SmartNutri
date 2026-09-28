const idString = { type: 'string', pattern: '^[0-9]+$' } as const;
const nullableText = { type: ['string', 'null'], maxLength: 2000 } as const;
const nullableShortText = { type: ['string', 'null'], maxLength: 255 } as const;
const nullableMeasurement = { type: ['number', 'null'], exclusiveMinimum: 0, maximum: 999.9 } as const;
const isoDate = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const;

export const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: idString
  },
  additionalProperties: false
} as const;

export const patientEvaluationsParamsSchema = {
  type: 'object',
  required: ['patientId'],
  properties: {
    patientId: idString
  },
  additionalProperties: false
} as const;

const measurementProperties = {
  waistCm: nullableMeasurement,
  hipCm: nullableMeasurement,
  abdomenCm: nullableMeasurement,
  chestCm: nullableMeasurement,
  rightArmCm: nullableMeasurement,
  leftArmCm: nullableMeasurement,
  rightForearmCm: nullableMeasurement,
  leftForearmCm: nullableMeasurement,
  rightThighCm: nullableMeasurement,
  leftThighCm: nullableMeasurement,
  rightCalfCm: nullableMeasurement,
  leftCalfCm: nullableMeasurement,
  tricepsSkinfoldMm: nullableMeasurement,
  bicepsSkinfoldMm: nullableMeasurement,
  subscapularSkinfoldMm: nullableMeasurement,
  suprailiacSkinfoldMm: nullableMeasurement,
  abdominalSkinfoldMm: nullableMeasurement,
  pectoralSkinfoldMm: nullableMeasurement,
  midaxillarySkinfoldMm: nullableMeasurement,
  thighSkinfoldMm: nullableMeasurement,
  calfSkinfoldMm: nullableMeasurement
} as const;

export const createPhysicalEvaluationBodySchema = {
  type: 'object',
  required: ['evaluatedAt', 'weightKg', 'heightCm'],
  properties: {
    evaluatedAt: isoDate,
    weightKg: { type: 'number', exclusiveMinimum: 0, maximum: 600 },
    heightCm: { type: 'number', exclusiveMinimum: 0, maximum: 300 },
    goal: nullableShortText,
    ...measurementProperties,
    notes: nullableText
  },
  additionalProperties: false
} as const;

export const updatePhysicalEvaluationBodySchema = {
  type: 'object',
  minProperties: 1,
  properties: {
    evaluatedAt: isoDate,
    weightKg: { type: 'number', exclusiveMinimum: 0, maximum: 600 },
    heightCm: { type: 'number', exclusiveMinimum: 0, maximum: 300 },
    goal: nullableShortText,
    ...measurementProperties,
    notes: nullableText
  },
  additionalProperties: false
} as const;
