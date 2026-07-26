import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail')
    .email('E-mail inválido'),
  password: z
    .string()
    .min(1, 'Informe sua senha')
    .min(6, 'A senha deve ter ao menos 6 caracteres'),
  rememberMe: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
