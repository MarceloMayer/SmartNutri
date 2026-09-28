import type { FastifyInstance } from 'fastify';

import { authorizeRoles } from '../../auth/auth.middleware';
import { openReadStream } from '../../storage/local-storage';
import { MealFeedController } from './meal-feed.controller';
import { MealFeedRepository } from './meal-feed.repository';
import {
  createMealPostBodySchema,
  createMealPostCommentBodySchema,
  mealPostParamsSchema
} from './meal-feed.schemas';
import type {
  CreateMealPostBody,
  CreateMealPostCommentBody,
  MealPostParams
} from './meal-feed.types';

export async function mealFeedRoutes(app: FastifyInstance) {
  const controller = new MealFeedController(new MealFeedRepository(app.db));
  const feedRoles = [authorizeRoles(['patient', 'nutritionist'])];

  app.get('/', { preHandler: feedRoles }, async (request) => {
    return controller.list(request.auth!);
  });

  app.post<{ Body: CreateMealPostBody }>('/', {
    preHandler: [authorizeRoles(['patient'])],
    schema: { body: createMealPostBodySchema }
  }, async (request, reply) => {
    const result = await controller.createPost(request.auth!, request.body);

    if (result.status === 'patient_not_linked') {
      return reply.code(403).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.post<{ Params: MealPostParams; Body: CreateMealPostCommentBody }>('/:postId/comments', {
    preHandler: feedRoles,
    schema: {
      params: mealPostParamsSchema,
      body: createMealPostCommentBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.createComment(request.auth!, request.params.postId, request.body);

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    if (result.status === 'invalid') {
      return reply.code(422).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.post<{ Params: MealPostParams }>('/:postId/image', {
    preHandler: [authorizeRoles(['patient'])],
    schema: { params: mealPostParamsSchema }
  }, async (request, reply) => {
    const fileData = await request.file();

    if (!fileData) {
      return reply.code(400).send({ message: 'Envie uma imagem para a refeição.' });
    }

    const result = await controller.uploadImage(request.auth!, request.params.postId, fileData);

    if (result.status === 'patient_not_linked') {
      return reply.code(403).send({ message: result.message });
    }

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    if (result.status === 'invalid') {
      return reply.code(422).send({ message: result.message });
    }

    return result.data;
  });

  app.get<{ Params: MealPostParams }>('/:postId/image', {
    preHandler: feedRoles,
    schema: { params: mealPostParamsSchema }
  }, async (request, reply) => {
    const result = await controller.getImage(request.auth!, request.params.postId);

    if (result.status === 'not_found') {
      return reply.code(404).send({ message: result.message });
    }

    return reply
      .header('Content-Type', result.data.mimeType)
      .header('Content-Disposition', 'inline')
      .send(openReadStream(result.data.filePath));
  });
}
