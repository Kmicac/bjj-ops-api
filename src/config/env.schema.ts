import { z } from 'zod';

const booleanStringSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const databaseUrlSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return ['postgres:', 'postgresql:', 'prisma+postgres:'].includes(protocol);
    } catch {
      return false;
    }
  }, 'DATABASE_URL must be a valid PostgreSQL connection URL');

const rawEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().trim().min(1).default('bjj-ops-api'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: databaseUrlSchema,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  RATE_LIMIT_TTL_MS: z.coerce.number().int().min(1000).default(60_000),
  RATE_LIMIT_LIMIT: z.coerce.number().int().min(1).default(60),
  TRUST_PROXY: booleanStringSchema,
  INTEGRATIONS_CONFIG_ENCRYPTION_KEY: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) {
        return true;
      }

      try {
        return Buffer.from(value, 'base64').length === 32;
      } catch {
        return false;
      }
    }, 'INTEGRATIONS_CONFIG_ENCRYPTION_KEY must be a base64-encoded 32-byte key'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().trim().min(1).optional(),
  MERCADO_PAGO_PUBLIC_KEY: z.string().trim().min(1).optional(),
  MERCADO_PAGO_APPLICATION_ID: z.string().trim().min(1).optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
  MERCADO_PAGO_ENVIRONMENT: z
    .enum(['sandbox', 'test', 'production'])
    .transform((value) => (value === 'production' ? 'production' : 'test'))
    .optional(),
  MERCADO_PAGO_SUCCESS_URL: z.string().url().optional(),
  MERCADO_PAGO_FAILURE_URL: z.string().url().optional(),
  MERCADO_PAGO_PENDING_URL: z.string().url().optional(),
  MERCADO_PAGO_NOTIFICATION_URL: z
    .string()
    .url()
    .optional()
    .refine((value) => {
      if (!value) {
        return true;
      }

      return new URL(value).protocol === 'https:';
    }, 'MERCADO_PAGO_NOTIFICATION_URL must use https'),
});

export type EnvironmentVariables = z.output<typeof rawEnvironmentSchema>;

export function validateEnvironment(config: Record<string, unknown>) {
  return rawEnvironmentSchema.parse(config);
}
