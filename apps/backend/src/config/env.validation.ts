import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  AUTH_MODE: z.enum(['stub', 'jwt']).default('stub'),
  DATABASE_URL: z.string().min(1),
  BRASILAPI_BASE_URL: z
    .string()
    .url()
    .default('https://brasilapi.com.br/api'),
  STUB_TENANT_ID: z.string().default('tnt_dev'),
  STUB_USER_ID: z.string().default('usr_dev'),
  STUB_ROLE: z
    .enum(['owner', 'admin', 'accountant', 'viewer'])
    .default('owner'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Variáveis de ambiente inválidas: ${details}`);
  }
  return parsed.data;
}
