import type { FastifyInstance } from 'fastify';

import { authenticate, authorizeRoles } from '../../auth/auth.middleware';
import { userRoles } from '../../auth/auth.types';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import {
  changePasswordBodySchema,
  loginBodySchema,
  registerUserBodySchema,
  requestPasswordResetBodySchema,
  resetPasswordBodySchema
} from './auth.schemas';
import type {
  ChangePasswordBody,
  LoginBody,
  RegisterUserBody,
  RequestPasswordResetBody,
  ResetPasswordBody
} from './auth.types';

export async function authRoutes(app: FastifyInstance) {
  const repository = new AuthRepository(app.db);
  const controller = new AuthController(repository);

  app.post<{ Body: RegisterUserBody }>('/register', {
    schema: {
      body: registerUserBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.register(request.body);

    if (result.status === 'conflict') {
      return reply.code(409).send({ message: result.message });
    }

    return reply.code(201).send(result.data);
  });

  app.post<{ Body: LoginBody }>('/login', {
    schema: {
      body: loginBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.login(request.body);

    if (result.status !== 'ok') {
      return reply.code(401).send({ message: result.message });
    }

    return result.data;
  });

  app.post<{ Body: RequestPasswordResetBody }>('/forgot-password', {
    schema: {
      body: requestPasswordResetBodySchema
    }
  }, async (request) => {
    return controller.requestPasswordReset(request.body.email);
  });

  app.post<{ Body: ResetPasswordBody }>('/reset-password', {
    schema: {
      body: resetPasswordBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.resetPassword(request.body);

    if (result.status !== 'ok') {
      return reply.code(400).send({ message: result.message });
    }

    return result;
  });

  app.get('/me', {
    preHandler: [authenticate, authorizeRoles(userRoles)]
  }, async (request, reply) => {
    const user = await controller.me(request.auth?.userId ?? 0);

    if (!user) {
      return reply.code(404).send({ message: 'User not found' });
    }

    return { user };
  });

  app.post<{ Body: ChangePasswordBody }>('/change-password', {
    preHandler: [authenticate, authorizeRoles(userRoles)],
    schema: {
      body: changePasswordBodySchema
    }
  }, async (request, reply) => {
    const result = await controller.changePassword(request.auth?.userId ?? 0, request.body);

    if (result.status !== 'ok') {
      return reply.code(400).send({ message: result.message });
    }

    return result;
  });
}
