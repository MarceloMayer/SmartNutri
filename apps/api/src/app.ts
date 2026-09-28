import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastify, { type FastifyServerOptions } from 'fastify';

import { env } from './config/env';
import { registerModules } from './modules/register-modules';
import { authContextPlugin } from './plugins/auth-context';
import { mysqlPlugin } from './plugins/mysql';

function parseCorsOrigin(origin: string): boolean | string | string[] {
  if (origin === '*') {
    return true;
  }

  const origins = origin.split(',').map((item) => item.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

export async function buildApp(options: FastifyServerOptions = {}) {
  const app = fastify({
    logger: env.nodeEnv === 'development',
    ...options
  });

  await app.register(cors, {
    origin: parseCorsOrigin(env.corsOrigin)
  });

  await app.register(authContextPlugin);
  await app.register(mysqlPlugin);
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
  });

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'smart-nutri-api'
    };
  });

  await app.register(registerModules);
  await app.register(registerModules, { prefix: '/api' });

  return app;
}
