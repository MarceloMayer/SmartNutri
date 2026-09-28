import 'dotenv/config';

type NodeEnv = 'development' | 'test' | 'production';

function numberFromEnv(key: string, fallback: number): number {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nodeEnvFromEnv(): NodeEnv {
  const value = process.env.NODE_ENV;

  if (value === 'test' || value === 'production') {
    return value;
  }

  return 'development';
}

export const env = {
  nodeEnv: nodeEnvFromEnv(),
  host: process.env.API_HOST ?? '0.0.0.0',
  port: numberFromEnv('API_PORT', 3333),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  auth: {
    jwtSecret: process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET ?? 'smart-nutri-development-secret',
    jwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN ?? '1d'
  },
  mysql: {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: numberFromEnv('MYSQL_PORT', 3306),
    user: process.env.MYSQL_USER ?? 'smart_nutri',
    password: process.env.MYSQL_PASSWORD ?? 'smart_nutri',
    database: process.env.MYSQL_DATABASE ?? 'smart_nutri',
    connectionLimit: numberFromEnv('MYSQL_CONNECTION_LIMIT', 10)
  },
  webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:4200',
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    fromEmail: process.env.RESEND_FROM_EMAIL ?? 'Smart Nutri <onboarding@resend.dev>'
  }
};
