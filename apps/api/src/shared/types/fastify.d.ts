import 'fastify';
import type { Pool } from 'mysql2/promise';

import type { AuthContext } from '../../auth/auth.types';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
  }

  interface FastifyRequest {
    auth: AuthContext | null;
  }
}
