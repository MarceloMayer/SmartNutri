import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env';
import { isUserRole, type UserRole } from './auth.types';

type AuthJwtPayload = JwtPayload & {
  role?: unknown;
};

const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

/**
 * Only the truly public auth endpoints skip authentication here. Authenticated
 * /auth/* routes (e.g. /auth/me, /auth/change-password) attach `authenticate`
 * directly as a route-level preHandler, since they're registered before the
 * global preHandler hook in registerModules() and are not covered by it.
 */
function shouldSkipGlobalApiAuth(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0] ?? '';

  return publicAuthPaths.some((publicPath) => path === publicPath);
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply | void> {
  if (shouldSkipGlobalApiAuth(request)) {
    request.auth = null;
    return;
  }

  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    request.auth = null;
    return reply.code(401).send({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, env.auth.jwtSecret) as AuthJwtPayload;
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0 || !isUserRole(payload.role)) {
      request.auth = null;
      return reply.code(401).send({ message: 'Invalid token' });
    }

    request.auth = {
      userId,
      role: payload.role,
      roles: [payload.role]
    };
  } catch {
    request.auth = null;
    return reply.code(401).send({ message: 'Invalid or expired token' });
  }
}

export function authorizeRoles(allowedRoles: readonly UserRole[]) {
  const allowedRoleSet = new Set<UserRole>(allowedRoles);

  return async function authorizeRole(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply | void> {
    if (shouldSkipGlobalApiAuth(request)) {
      return;
    }

    if (!request.auth) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    if (!allowedRoleSet.has(request.auth.role)) {
      return reply.code(403).send({ message: 'Forbidden' });
    }
  };
}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}
