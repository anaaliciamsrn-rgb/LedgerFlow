import { z } from 'zod';

/** Origens permitidas no CORS, separadas por vírgula. */
function parseOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export const envSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    AUTH_MODE: z.enum(['stub', 'jwt']).default('stub'),
    DATABASE_URL: z.string().min(1),
    BRASILAPI_BASE_URL: z
      .string()
      .url()
      .default('https://brasilapi.com.br/api'),
    /**
     * Domínios autorizados a chamar a API, separados por vírgula.
     * Ex.: `https://ledgerflow.vercel.app,https://app.escritorio.com.br`
     */
    CORS_ORIGINS: z.string().default(''),
    STUB_TENANT_ID: z.string().default('tnt_dev'),
    STUB_USER_ID: z.string().default('usr_dev'),
    STUB_ROLE: z
      .enum(['owner', 'admin', 'accountant', 'viewer'])
      .default('owner'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }

    /**
     * `AUTH_MODE=stub` em produção é uma decisão consciente do projeto: o
     * sistema não tem autenticação, e o escritório vem do header
     * `x-tenant-id`. Quem conhecer a URL lê a carteira de qualquer
     * escritório. O processo sobe assim, mas avisa no arranque (ver
     * `main.ts`) — a escolha fica registrada no log em vez de silenciosa.
     */

    /**
     * Sem lista de origens o CORS refletiria qualquer site que chamasse a API.
     * Em produção a lista é obrigatória.
     */
    if (parseOrigins(env.CORS_ORIGINS).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message:
          'CORS_ORIGINS é obrigatório em produção: informe os domínios do ' +
          'frontend separados por vírgula (ex.: https://seu-app.vercel.app).',
      });
    }
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

/** Lista de origens já normalizada, para o `enableCors` do bootstrap. */
export function corsOrigins(value: string | undefined): string[] {
  return parseOrigins(value);
}
