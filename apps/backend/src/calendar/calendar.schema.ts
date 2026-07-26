import { z } from 'zod';
import type { Obligation } from '@prisma/client';

export const obligationStatusSchema = z.enum(['pending', 'completed']);

export const createObligationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  dueDate: z.coerce.date({ invalid_type_error: 'Data de vencimento inválida' }),
  companyId: z.string().optional(),
});
export type CreateObligationInput = z.infer<typeof createObligationSchema>;

export const updateObligationSchema = z
  .object({
    title: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    dueDate: z.coerce.date().optional(),
    status: obligationStatusSchema.optional(),
  })
  .strict();
export type UpdateObligationInput = z.infer<typeof updateObligationSchema>;

export const listObligationsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: obligationStatusSchema.optional(),
});
export type ListObligationsQuery = z.infer<typeof listObligationsQuerySchema>;

export interface ObligationDto {
  readonly id: string;
  readonly companyId: string | null;
  readonly title: string;
  readonly type: string;
  readonly dueDate: string;
  readonly status: string;
  readonly overdue: boolean;
  readonly createdAt: string;
}

export function toObligationDto(
  obligation: Obligation,
  now: Date = new Date(),
): ObligationDto {
  return {
    id: obligation.id,
    companyId: obligation.companyId,
    title: obligation.title,
    type: obligation.type,
    dueDate: obligation.dueDate.toISOString(),
    status: obligation.status,
    overdue: obligation.status === 'pending' && obligation.dueDate < now,
    createdAt: obligation.createdAt.toISOString(),
  };
}
