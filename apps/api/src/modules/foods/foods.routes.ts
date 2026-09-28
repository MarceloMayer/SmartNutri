import type { FastifyInstance } from 'fastify';

import { FoodsController } from './foods.controller';
import { FoodsRepository } from './foods.repository';
import { foodListQuerySchema, foodParamsSchema, foodSearchQuerySchema } from './foods.schemas';
import type { FoodListQuery, FoodParams, FoodSearchQuery } from './foods.types';

export async function foodsRoutes(app: FastifyInstance) {
  const repository = new FoodsRepository(app.db);
  const controller = new FoodsController(repository);

  app.get<{ Querystring: FoodListQuery }>('/', {
    schema: {
      querystring: foodListQuerySchema
    }
  }, async (request) => {
    return controller.list(request.query);
  });

  app.get<{ Querystring: FoodSearchQuery }>('/search', {
    schema: {
      querystring: foodSearchQuerySchema
    }
  }, async (request) => {
    return controller.search(request.query);
  });

  app.get<{ Params: FoodParams }>('/:id', {
    schema: {
      params: foodParamsSchema
    }
  }, async (request, reply) => {
    const food = await controller.findById(request.params.id);

    if (!food) {
      return reply.code(404).send({ message: 'Food not found' });
    }

    return food;
  });
}
