import type { FastifyInstance } from 'fastify';

import { SubstitutionsController } from './substitutions.controller';
import { SubstitutionsRepository } from './substitutions.repository';
import { calculateSubstitutionsBodySchema, substitutionsQuerySchema } from './substitutions.schemas';
import type { CalculateSubstitutionsBody, SubstitutionsQuery } from './substitutions.types';

export async function substitutionsRoutes(app: FastifyInstance) {
  const repository = new SubstitutionsRepository(app.db);
  const controller = new SubstitutionsController(repository);

  app.get<{ Querystring: SubstitutionsQuery }>('/', {
    schema: {
      querystring: substitutionsQuerySchema
    }
  }, async (request) => {
    return controller.list(request.query);
  });

  app.post<{ Body: CalculateSubstitutionsBody }>('/calculate', {
    schema: {
      body: calculateSubstitutionsBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.calculate(request.body, {
      nutritionistUserId: request.auth?.role === 'nutritionist'
        ? request.auth.userId
        : undefined
    });

    if (result.status !== 'ok') {
      const statusCode = result.status === 'not_found' ? 404 : 422;
      return reply.code(statusCode).send({ message: result.message });
    }

    return result.data;
  });
}
