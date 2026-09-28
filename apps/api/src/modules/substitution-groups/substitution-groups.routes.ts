import type { FastifyInstance } from 'fastify';

import { SubstitutionGroupsController } from './substitution-groups.controller';
import { SubstitutionGroupsRepository } from './substitution-groups.repository';
import {
  addFoodToGroupBodySchema,
  createSubstitutionGroupBodySchema,
  substitutionGroupFoodParamsSchema,
  substitutionGroupParamsSchema,
  updateSubstitutionGroupBodySchema,
  updateSubstitutionGroupStatusBodySchema
} from './substitution-groups.schemas';
import type {
  AddFoodToGroupBody,
  CreateSubstitutionGroupBody,
  SubstitutionGroupFoodParams,
  SubstitutionGroupParams,
  UpdateSubstitutionGroupBody,
  UpdateSubstitutionGroupStatusBody
} from './substitution-groups.types';

export async function substitutionGroupsRoutes(app: FastifyInstance) {
  const repository = new SubstitutionGroupsRepository(app.db);
  const controller = new SubstitutionGroupsController(repository);

  app.get('/', async () => {
    return controller.list();
  });

  app.post<{ Body: CreateSubstitutionGroupBody }>('/', {
    schema: {
      body: createSubstitutionGroupBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.create(request.body);

    if (result.status === 'conflict') {
      return reply.code(409).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.get<{ Params: SubstitutionGroupParams }>('/:id', {
    schema: {
      params: substitutionGroupParamsSchema
    }
  }, async (request, reply) => {
    const group = await controller.findById(request.params.id);

    if (!group) {
      return reply.code(404).send({ message: 'Substitution group not found' });
    }

    return group;
  });

  app.put<{ Params: SubstitutionGroupParams; Body: UpdateSubstitutionGroupBody }>('/:id', {
    schema: {
      params: substitutionGroupParamsSchema,
      body: updateSubstitutionGroupBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.update(request.params.id, request.body);

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    if (result.status === 'conflict') {
      return reply.code(409).send({ message: result.message });
    }

    return result.data;
  });

  app.patch<{ Params: SubstitutionGroupParams; Body: UpdateSubstitutionGroupStatusBody }>('/:id/status', {
    schema: {
      params: substitutionGroupParamsSchema,
      body: updateSubstitutionGroupStatusBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.updateStatus(request.params.id, request.body);

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return result.data;
  });

  app.get<{ Params: SubstitutionGroupParams }>('/:id/foods', {
    schema: {
      params: substitutionGroupParamsSchema
    }
  }, async (request, reply) => {
    const group = await controller.findById(request.params.id);

    if (!group) {
      return reply.code(404).send({ message: 'Substitution group not found' });
    }

    return controller.findFoodsByGroupId(request.params.id);
  });

  app.post<{ Params: SubstitutionGroupParams; Body: AddFoodToGroupBody }>('/:id/foods', {
    schema: {
      params: substitutionGroupParamsSchema,
      body: addFoodToGroupBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.addFoodToGroup(request.params.id, request.body);

    if (result.status === 'not_found' || result.status === 'food_not_found') {
      return reply.code(404).send({ message: result.message });
    }

    if (result.status === 'conflict') {
      return reply.code(409).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.delete<{ Params: SubstitutionGroupFoodParams }>('/:id/foods/:foodId', {
    schema: {
      params: substitutionGroupFoodParamsSchema
    }
  }, async (request, reply) => {
    const result = await controller.removeFoodFromGroup(
      request.params.id,
      request.params.foodId
    );

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return reply.code(204).send();
  });
}
