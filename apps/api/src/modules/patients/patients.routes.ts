import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { SubstitutionsController } from '../substitutions/substitutions.controller';
import { SubstitutionsRepository } from '../substitutions/substitutions.repository';
import { PatientsController } from './patients.controller';
import { PatientsRepository } from './patients.repository';
import {
  createMealBodySchema,
  createMealPlanBodySchema,
  createMealPlanItemBodySchema,
  idParamsSchema,
  patientMealPlansParamsSchema,
  savePatientBodySchema,
  updateMealBodySchema,
  updateMealPlanBodySchema,
  updateMealPlanItemBodySchema,
  updatePatientBodySchema
} from './patients.schemas';
import type {
  CreateMealBody,
  CreateMealPlanBody,
  CreateMealPlanItemBody,
  CreatePatientBody,
  IdParams,
  PatientMealPlansParams,
  UpdateMealBody,
  UpdateMealPlanBody,
  UpdateMealPlanItemBody,
  UpdatePatientBody
} from './patients.types';

export async function patientsRoutes(app: FastifyInstance) {
  const repository = new PatientsRepository(app.db);
  const controller = new PatientsController(repository);
  const substitutionsController = new SubstitutionsController(new SubstitutionsRepository(app.db));

  app.get('/patients', async (request) => {
    return controller.listPatients(getNutritionistUserId(request));
  });

  app.post<{ Body: CreatePatientBody }>('/patients', {
    schema: {
      body: savePatientBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.createPatient(getNutritionistUserId(request), request.body);

    if (result.status === 'invalid') {
      return reply.code(400).send({ message: result.message });
    }

    if (result.status === 'conflict') {
      return reply.code(409).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.get<{ Params: IdParams }>('/patients/:id', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const patient = await controller.findPatientById(
      getNutritionistUserId(request),
      request.params.id
    );

    if (!patient) {
      return reply.code(404).send({ message: 'Patient not found' });
    }

    return patient;
  });

  async function updatePatientHandler(
    request: FastifyRequest<{ Params: IdParams; Body: UpdatePatientBody }>,
    reply: FastifyReply
  ) {
    const patient = await controller.updatePatient(
      getNutritionistUserId(request),
      request.params.id,
      request.body
    );

    if (!patient) {
      return reply.code(404).send({ message: 'Patient not found' });
    }

    return patient;
  }

  app.patch<{ Params: IdParams; Body: UpdatePatientBody }>('/patients/:id', {
    schema: {
      params: idParamsSchema,
      body: updatePatientBodySchema
    }
  }, updatePatientHandler);

  app.put<{ Params: IdParams; Body: UpdatePatientBody }>('/patients/:id', {
    schema: {
      params: idParamsSchema,
      body: updatePatientBodySchema
    }
  }, updatePatientHandler);

  app.delete<{ Params: IdParams }>('/patients/:id', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const deleted = await controller.deletePatient(
      getNutritionistUserId(request),
      request.params.id
    );

    if (!deleted) {
      return reply.code(404).send({ message: 'Patient not found' });
    }

    return reply.code(204).send();
  });

  app.get('/meal-plans', async (request) => {
    const result = await controller.listMealPlans(getNutritionistUserId(request));

    return result.data;
  });

  app.post<{ Body: CreateMealPlanBody }>('/meal-plans', {
    schema: {
      body: createMealPlanBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.createMealPlan(
      getNutritionistUserId(request),
      request.body
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.get<{ Params: PatientMealPlansParams }>('/patients/:patientId/meal-plans', {
    schema: {
      params: patientMealPlansParamsSchema
    }
  }, async (request, reply) => {
    const result = await controller.listMealPlans(
      getNutritionistUserId(request),
      request.params.patientId
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return result.data;
  });

  app.post<{ Params: PatientMealPlansParams; Body: CreateMealPlanBody }>('/patients/:patientId/meal-plans', {
    schema: {
      params: patientMealPlansParamsSchema,
      body: createMealPlanBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.createMealPlan(
      getNutritionistUserId(request),
      request.body,
      request.params.patientId
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.post<{ Params: IdParams }>('/meal-plans/:id/recalculate', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const mealPlan = await controller.recalculateMealPlan(
      getNutritionistUserId(request),
      request.params.id
    );

    if (!mealPlan) {
      return reply.code(404).send({ message: 'Meal plan not found' });
    }

    return mealPlan;
  });

  app.get<{ Params: IdParams }>('/meal-plans/:id', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const mealPlan = await controller.findMealPlanDetailById(
      getNutritionistUserId(request),
      request.params.id
    );

    if (!mealPlan) {
      return reply.code(404).send({ message: 'Meal plan not found' });
    }

    return mealPlan;
  });

  async function updateMealPlanHandler(
    request: FastifyRequest<{ Params: IdParams; Body: UpdateMealPlanBody }>,
    reply: FastifyReply
  ) {
    const result = await controller.updateMealPlan(
      getNutritionistUserId(request),
      request.params.id,
      request.body
    );

    if (result.status !== 'ok') {
      return reply.code(404).send({ message: result.message });
    }

    return result.data;
  }

  app.patch<{ Params: IdParams; Body: UpdateMealPlanBody }>('/meal-plans/:id', {
    schema: {
      params: idParamsSchema,
      body: updateMealPlanBodySchema
    }
  }, updateMealPlanHandler);

  app.put<{ Params: IdParams; Body: UpdateMealPlanBody }>('/meal-plans/:id', {
    schema: {
      params: idParamsSchema,
      body: updateMealPlanBodySchema
    }
  }, updateMealPlanHandler);

  app.delete<{ Params: IdParams }>('/meal-plans/:id', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const deleted = await controller.deleteMealPlan(
      getNutritionistUserId(request),
      request.params.id
    );

    if (!deleted) {
      return reply.code(404).send({ message: 'Meal plan not found' });
    }

    return reply.code(204).send();
  });

  app.get<{ Params: IdParams }>('/meal-plans/:id/meals', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const result = await controller.listMeals(
      getNutritionistUserId(request),
      request.params.id
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return result.data;
  });

  app.post<{ Params: IdParams; Body: CreateMealBody }>('/meal-plans/:id/meals', {
    schema: {
      params: idParamsSchema,
      body: createMealBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.createMeal(
      getNutritionistUserId(request),
      request.params.id,
      request.body
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  async function updateMealHandler(
    request: FastifyRequest<{ Params: IdParams; Body: UpdateMealBody }>,
    reply: FastifyReply
  ) {
    const meal = await controller.updateMeal(
      getNutritionistUserId(request),
      request.params.id,
      request.body
    );

    if (!meal) {
      return reply.code(404).send({ message: 'Meal not found' });
    }

    return meal;
  }

  app.patch<{ Params: IdParams; Body: UpdateMealBody }>('/meal-plan-meals/:id', {
    schema: {
      params: idParamsSchema,
      body: updateMealBodySchema
    }
  }, updateMealHandler);

  app.put<{ Params: IdParams; Body: UpdateMealBody }>('/meal-plan-meals/:id', {
    schema: {
      params: idParamsSchema,
      body: updateMealBodySchema
    }
  }, updateMealHandler);

  app.delete<{ Params: IdParams }>('/meal-plan-meals/:id', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const deleted = await controller.deleteMeal(
      getNutritionistUserId(request),
      request.params.id
    );

    if (!deleted) {
      return reply.code(404).send({ message: 'Meal not found' });
    }

    return reply.code(204).send();
  });

  app.get<{ Params: IdParams }>('/meal-plan-meals/:id/items', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const result = await controller.listItems(
      getNutritionistUserId(request),
      request.params.id
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return result.data;
  });

  app.post<{ Params: IdParams; Body: CreateMealPlanItemBody }>('/meal-plan-meals/:id/items', {
    schema: {
      params: idParamsSchema,
      body: createMealPlanItemBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.createItem(
      getNutritionistUserId(request),
      request.params.id,
      request.body
    );

    if (result.status === 'not_found' || result.status === 'food_not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  async function updateItemHandler(
    request: FastifyRequest<{ Params: IdParams; Body: UpdateMealPlanItemBody }>,
    reply: FastifyReply
  ) {
    const result = await controller.updateItem(
      getNutritionistUserId(request),
      request.params.id,
      request.body
    );

    if (result.status === 'not_found' || result.status === 'food_not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return result.data;
  }

  app.patch<{ Params: IdParams; Body: UpdateMealPlanItemBody }>('/meal-plan-items/:id', {
    schema: {
      params: idParamsSchema,
      body: updateMealPlanItemBodySchema
    }
  }, updateItemHandler);

  app.put<{ Params: IdParams; Body: UpdateMealPlanItemBody }>('/meal-plan-items/:id', {
    schema: {
      params: idParamsSchema,
      body: updateMealPlanItemBodySchema
    }
  }, updateItemHandler);

  app.delete<{ Params: IdParams }>('/meal-plan-items/:id', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const deleted = await controller.deleteItem(
      getNutritionistUserId(request),
      request.params.id
    );

    if (!deleted) {
      return reply.code(404).send({ message: 'Meal plan item not found' });
    }

    return reply.code(204).send();
  });

  app.post<{ Params: IdParams }>('/meal-plan-items/:id/substitutions', {
    schema: {
      params: idParamsSchema
    }
  }, async (request, reply) => {
    const item = await controller.findItemById(
      getNutritionistUserId(request),
      request.params.id
    );

    if (!item) {
      return reply.code(404).send({ message: 'Meal plan item not found' });
    }

    const result = await substitutionsController.calculate(
      {
        foodId: item.foodId,
        quantity: item.quantity,
        limit: 10
      },
      {
        nutritionistUserId: getNutritionistUserId(request)
      }
    );

    if (result.status !== 'ok') {
      const statusCode = result.status === 'not_found' ? 404 : 422;
      return reply.code(statusCode).send({ message: result.message });
    }

    return result.data;
  });
}

function getNutritionistUserId(request: { auth: { userId: number } | null }): number {
  return request.auth?.userId ?? 0;
}
