import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createPool } from 'mysql2/promise';

import { env } from '../config/env';

export const mysqlPlugin = fp(async (app: FastifyInstance) => {
  const pool = createPool({
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    database: env.mysql.database,
    connectionLimit: env.mysql.connectionLimit,
    namedPlaceholders: true,
    decimalNumbers: true
  });

  app.decorate('db', pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });
}, {
  name: 'mysql'
});
