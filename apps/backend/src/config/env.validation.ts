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
    /**
     * Chave que assina o token de sessão. Obrigatória sempre que
     * `AUTH_MODE=jwt` — sem ela, qualquer um forjaria um token.
     */
    JWT_SECRET: z.string().default(''),
    /**
     * `true` quando frontend e API estão em domínios diferentes, o que exige
     * cookie `SameSite=None`. O arranjo recomendado é o mesmo domínio (ver
     * docs/DEPLOY.md), então o padrão é `false`.
     */
    CROSS_SITE_COOKIE: z.enum(['true', 'false']).default('false'),
    STUB_TENANT_ID: z.string().default('tnt_dev'),
    STUB_USER_ID: z.string().default('usr_dev'),
    STUB_ROLE: z
      .enum(['owner', 'admin', 'accountant', 'viewer'])
      .default('owner'),
  })
  .superRefine((env, ctx) => {
    /**
     * Vale em qualquer ambiente: `AUTH_MODE=jwt` sem chave de assinatura
     * deixaria o servidor aceitando tokens que ele mesmo não consegue
     * validar — falha silenciosa que só apareceria no primeiro login.
     */
    if (env.AUTH_MODE === 'jwt' && env.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message:
          'AUTH_MODE=jwt exige JWT_SECRET com ao menos 32 caracteres. ' +
          'Gere uma com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
      });
    }

    if (env.NODE_ENV !== 'production') {
      return;
    }

    /**
     * `AUTH_MODE=stub` aceita o tenant vindo do header `x-tenant-id`: quem
     * souber a URL lê a carteira de qualquer escritório. É aceitável no
     * desenvolvimento e inaceitável num domínio público — por isso o processo
     * se recusa a subir assim, em vez de depender de alguém lembrar.
     */
    if (env.AUTH_MODE === 'stub') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_MODE'],
        message:
          'AUTH_MODE=stub não pode rodar em produção: o tenant viria do header ' +
          'x-tenant-id e qualquer pessoa leria os dados de qualquer escritório. ' +
          'Use AUTH_MODE=jwt.',
      });
    }

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
