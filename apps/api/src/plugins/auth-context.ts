import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export const authContextPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('auth', null);

  app.addHook('onRequest', async (request) => {
    request.auth = null;
  });
}, {
  name: 'auth-context'
});
