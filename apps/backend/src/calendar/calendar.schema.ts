import { z } from 'zod';
import type { Obligation } from '@prisma/client';

export const obligationStatusSchema = z.enum(['pending', 'completed']);

export const recurrenceSchema = z.enum(['none', 'monthly']);
export type Recurrence = z.infer<typeof recurrenceSchema>;

export const createObligationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  dueDate: z.coerce.date({ invalid_type_error: 'Data de vencimento inválida' }),
  companyId: z.string().optional(),
  assignee: z.string().min(1, 'Responsável é obrigatório'),
  recurrence: recurrenceSchema.default('none'),
  occurrences: z.coerce.number().int().min(1).max(24).default(1),
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
  assignee: z.string().optional(),
});
export type ListObligationsQuery = z.infer<typeof listObligationsQuerySchema>;

export interface ObligationDto {
  readonly id: string;
  readonly companyId: string | null;
  readonly title: string;
  readonly type: string;
  readonly dueDate: string;
  readonly status: string;
  readonly assignee: string;
  readonly recurrenceGroupId: string | null;
  readonly overdue: boolean;
  /** Nome do feriado nacional que coincide com o vencimento, ou null. Nunca persistido. */
  readonly holidayConflict: string | null;
  readonly createdAt: string;
}

export function toObligationDto(
  obligation: Obligation,
  now: Date = new Date(),
  holidays: ReadonlyMap<string, string> = new Map(),
): ObligationDto {
  // `dueDate` é gravado/lido sempre em UTC (meia-noite), então a fatia
  // YYYY-MM-DD do ISO string bate com a chave do mapa de feriados
  // (também YYYY-MM-DD) sem depender do fuso local do processo.
  const isoDay = obligation.dueDate.toISOString().slice(0, 10);
  return {
    id: obligation.id,
    companyId: obligation.companyId,
    title: obligation.title,
    type: obligation.type,
    dueDate: obligation.dueDate.toISOString(),
    status: obligation.status,
    assignee: obligation.assignee,
    recurrenceGroupId: obligation.recurrenceGroupId,
    overdue: obligation.status === 'pending' && obligation.dueDate < now,
    holidayConflict: holidays.get(isoDay) ?? null,
    createdAt: obligation.createdAt.toISOString(),
  };
}
