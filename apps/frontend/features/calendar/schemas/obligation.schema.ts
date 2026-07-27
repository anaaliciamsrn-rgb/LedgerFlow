import { z } from 'zod';

export const obligationFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Informe um título')
      .max(120, 'Título muito longo'),
    type: z.enum(['FOLHA', 'DOCUMENTOS', 'GUIAS', 'CONFERENCIA', 'OUTRO']),
    customType: z.string().trim().max(60, 'Descrição muito longa').optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data de vencimento'),
    companyId: z.string().optional(),
    collaboratorId: z.string().min(1, 'Escolha um responsável'),
    recurrence: z.enum([
      'none',
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'yearly',
    ]),
    occurrences: z.coerce.number().int().min(1).max(24),
  })
  .superRefine((value, ctx) => {
    // Espelha a regra do backend: "Outro" sem descrição não identifica a tarefa.
    if (value.type === 'OUTRO' && !value.customType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customType'],
        message: 'Descreva a tarefa quando o tipo for "Outro"',
      });
    }
  });

export type ObligationFormValues = z.infer<typeof obligationFormSchema>;
