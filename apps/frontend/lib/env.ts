import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url({ message: 'NEXT_PUBLIC_API_URL deve ser uma URL válida' }),
  NEXT_PUBLIC_USE_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const parsed = EnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_USE_MOCKS: process.env.NEXT_PUBLIC_USE_MOCKS,
});

if (!parsed.success) {
  console.error(
    '❌ Variáveis de ambiente inválidas:',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Variáveis de ambiente inválidas. Verifique o .env.local');
}

export const env = parsed.data;