import type { FastifyInstance } from 'fastify';

import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { createUserBodySchema, updateUserBodySchema, userParamsSchema } from './users.schemas';
import type { CreateUserBody, UpdateUserBody, UserParams } from './users.types';

export async function usersRoutes(app: FastifyInstance) {
  const repository = new UsersRepository(app.db);
  const controller = new UsersController(repository);

  app.get('/users', async (request) => {
    return controller.list(request.auth!);
  });

  app.post<{ Body: CreateUserBody }>('/users', {
    schema: {
      body: createUserBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.create(request.auth!, request.body);

    if (result.status === 'forbidden') {
      return reply.code(403).send({ message: result.message });
    }

    if (result.status === 'conflict') {
      return reply.code(409).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.get<{ Params: UserParams }>('/users/:id', {
    schema: {
      params: userParamsSchema
    }
  }, async (request, reply) => {
    const result = await controller.findById(request.auth!, request.params.id);

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    if (result.status === 'forbidden') {
      return reply.code(403).send({ message: result.message });
    }

    return result.data;
  });

  app.patch<{ Params: UserParams; Body: UpdateUserBody }>('/users/:id', {
    schema: {
      params: userParamsSchema,
      body: updateUserBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.update(request.auth!, request.params.id, request.body);

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    if (result.status === 'forbidden') {
      return reply.code(403).send({ message: result.message });
    }

    if (result.status === 'conflict') {
      return reply.code(409).send({ message: result.message });
    }

    return result.data;
  });
}
