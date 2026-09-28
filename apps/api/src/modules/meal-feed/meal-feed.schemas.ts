const idString = { type: 'string', pattern: '^[0-9]+$' } as const;

export const mealPostParamsSchema = {
  type: 'object',
  required: ['postId'],
  properties: {
    postId: idString
  },
  additionalProperties: false
} as const;

export const createMealPostBodySchema = {
  type: 'object',
  required: ['mealName', 'visibility'],
  properties: {
    mealName: { type: 'string', minLength: 1, maxLength: 160 },
    description: { type: ['string', 'null'], maxLength: 2000 },
    visibility: {
      type: 'string',
      enum: ['nutritionist_only', 'shared_with_patients']
    }
  },
  additionalProperties: false
} as const;

export const createMealPostCommentBodySchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: { type: 'string', minLength: 1, maxLength: 1000 }
  },
  additionalProperties: false
} as const;
