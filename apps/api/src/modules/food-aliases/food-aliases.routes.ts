import type { FastifyInstance } from 'fastify';

import { FoodAliasesController } from './food-aliases.controller';
import { FoodAliasesRepository } from './food-aliases.repository';
import { foodAliasesQuerySchema } from './food-aliases.schemas';
import type { FoodAliasesQuery } from './food-aliases.types';

export async function foodAliasesRoutes(app: FastifyInstance) {
  const repository = new FoodAliasesRepository(app.db);
  const controller = new FoodAliasesController(repository);

  app.get<{ Querystring: FoodAliasesQuery }>('/', {
    schema: {
      querystring: foodAliasesQuerySchema
    }
  }, async (request) => {
    return controller.list(request.query);
  });
}
