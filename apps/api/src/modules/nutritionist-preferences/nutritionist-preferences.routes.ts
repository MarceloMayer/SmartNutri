import type { FastifyInstance } from 'fastify';

import { NutritionistPreferencesController } from './nutritionist-preferences.controller';
import { NutritionistPreferencesRepository } from './nutritionist-preferences.repository';
import {
  blockedSubstitutionParamsSchema,
  blockSubstitutionBodySchema,
  foodPreferenceParamsSchema,
  upsertFoodPreferenceBodySchema
} from './nutritionist-preferences.schemas';
import type {
  BlockedSubstitutionParams,
  BlockSubstitutionBody,
  FoodPreferenceParams,
  UpsertFoodPreferenceBody
} from './nutritionist-preferences.types';

export async function nutritionistPreferencesRoutes(app: FastifyInstance) {
  const repository = new NutritionistPreferencesRepository(app.db);
  const controller = new NutritionistPreferencesController(repository);

  app.get('/nutritionist-food-preferences', async (request) => {
    return controller.listFoodPreferences(getNutritionistUserId(request));
  });

  app.put<{ Params: FoodPreferenceParams; Body: UpsertFoodPreferenceBody }>('/nutritionist-food-preferences/:foodId', {
    schema: {
      params: foodPreferenceParamsSchema,
      body: upsertFoodPreferenceBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.upsertFoodPreference(
      getNutritionistUserId(request),
      request.params.foodId,
      request.body
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return result.data;
  });

  app.delete<{ Params: FoodPreferenceParams }>('/nutritionist-food-preferences/:foodId', {
    schema: {
      params: foodPreferenceParamsSchema
    }
  }, async (request, reply) => {
    await controller.deleteFoodPreference(
      getNutritionistUserId(request),
      request.params.foodId
    );

    return reply.code(204).send();
  });

  app.post<{ Body: BlockSubstitutionBody }>('/nutritionist-blocked-substitutions', {
    schema: {
      body: blockSubstitutionBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.blockSubstitution(
      getNutritionistUserId(request),
      request.body
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    if (result.status === 'unprocessable') {
      return reply.code(422).send({ message: result.message });
    }

    return result.data;
  });

  app.delete<{ Params: BlockedSubstitutionParams }>('/nutritionist-blocked-substitutions/:referenceFoodId/:blockedFoodId', {
    schema: {
      params: blockedSubstitutionParamsSchema
    }
  }, async (request, reply) => {
    await controller.deleteBlockedSubstitution(
      getNutritionistUserId(request),
      request.params.referenceFoodId,
      request.params.blockedFoodId
    );

    return reply.code(204).send();
  });
}

function getNutritionistUserId(request: { auth: { userId: number } | null }): number {
  return request.auth?.userId ?? 0;
}
