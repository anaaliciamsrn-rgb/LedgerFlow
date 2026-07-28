import { z } from 'zod';
import type { Collaborator, Obligation } from '@prisma/client';

export const obligationStatusSchema = z.enum(['pending', 'completed']);

/** Catálogo do brief. `OUTRO` abre o campo livre `customType`. */
export const obligationTypeSchema = z.enum([
  'FOLHA',
  'DOCUMENTOS',
  'GUIAS',
  'CONFERENCIA',
  'OUTRO',
]);
export type ObligationType = z.infer<typeof obligationTypeSchema>;

export const recurrenceSchema = z.enum([
  'none',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]);
export type Recurrence = z.infer<typeof recurrenceSchema>;

/**
 * `customType` só existe para `OUTRO`. Aceitar nos dois casos deixaria a
 * listagem com dois rótulos concorrentes para a mesma tarefa.
 */
export const createObligationSchema = z
  .object({
    title: z.string().trim().min(1, 'Título é obrigatório').max(120),
    type: obligationTypeSchema,
    customType: z.string().trim().min(1).max(60).optional(),
    dueDate: z.coerce.date({
      invalid_type_error: 'Data de vencimento inválida',
    }),
    companyId: z.string().optional(),
    collaboratorId: z.string().min(1, 'Responsável é obrigatório'),
    recurrence: recurrenceSchema.default('none'),
    occurrences: z.coerce.number().int().min(1).max(24).default(1),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'OUTRO' && !value.customType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customType'],
        message: 'Descreva a tarefa quando o tipo for "Outro"',
      });
    }
    if (value.type !== 'OUTRO' && value.customType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customType'],
        message: 'A descrição livre só vale para o tipo "Outro"',
      });
    }
  });
export type CreateObligationInput = z.infer<typeof createObligationSchema>;

/**
 * `type` e `customType` são editáveis: quem erra o tipo no cadastro precisa
 * poder corrigir sem apagar e recriar a tarefa. A dupla anda junta — trocar
 * para `OUTRO` exige a descrição, e sair de `OUTRO` limpa a descrição antiga
 * (o service converte a ausência em `null`, senão sobraria um rótulo órfão).
 */
export const updateObligationSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    type: obligationTypeSchema.optional(),
    customType: z.string().trim().min(1).max(60).nullable().optional(),
    dueDate: z.coerce.date().optional(),
    status: obligationStatusSchema.optional(),
    /** Move o vencimento para o dia útil anterior. Calculado no servidor. */
    action: z.literal('anticipate').optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === 'OUTRO' && !value.customType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customType'],
        message: 'Descreva a tarefa quando o tipo for "Outro"',
      });
    }
    if (value.type && value.type !== 'OUTRO' && value.customType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customType'],
        message: 'A descrição livre só vale para o tipo "Outro"',
      });
    }
    if (value.customType && !value.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: 'Informe o tipo junto com a descrição',
      });
    }
  });
export type UpdateObligationInput = z.infer<typeof updateObligationSchema>;

export const listObligationsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: obligationStatusSchema.optional(),
  collaboratorId: z.string().optional(),
});
export type ListObligationsQuery = z.infer<typeof listObligationsQuerySchema>;

/**
 * Atrasadas de qualquer mês. `total` é a contagem real; `items` vem limitado,
 * porque a faixa do topo é um alerta e não uma listagem completa. Contar
 * `items` faria a tela anunciar "100 em atraso" havendo 300.
 */
export interface OverdueDto {
  readonly total: number;
  readonly items: readonly ObligationDto[];
}

export const holidaysQuerySchema = z.object({
  year: z.coerce
    .number({ invalid_type_error: 'Ano inválido' })
    .int('Ano inválido')
    .min(2000, 'Ano fora do intervalo suportado')
    .max(2100, 'Ano fora do intervalo suportado'),
});
export type HolidaysQuery = z.infer<typeof holidaysQuerySchema>;

export interface HolidayDto {
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly name: string;
}

/** Forma que o service consulta: obrigação com responsável e empresa. */
export type ObligationWithRelations = Obligation & {
  collaborator: Collaborator;
  company: { id: string; name: string } | null;
};

export interface ObligationDto {
  readonly id: string;
  readonly title: string;
  readonly type: ObligationType;
  /** Preenchido só quando `type === 'OUTRO'`. */
  readonly customType: string | null;
  readonly dueDate: string;
  readonly status: string;
  readonly recurrence: Recurrence;
  readonly recurrenceGroupId: string | null;
  readonly collaborator: {
    readonly id: string;
    readonly name: string;
    readonly color: string;
  };
  readonly company: { readonly id: string; readonly name: string } | null;
  readonly overdue: boolean;
  /** Nome do feriado nacional que coincide com o vencimento, ou null. Nunca persistido. */
  readonly holidayConflict: string | null;
  readonly createdAt: string;
}

export function toObligationDto(
  obligation: ObligationWithRelations,
  now: Date = new Date(),
  holidays: ReadonlyMap<string, string> = new Map(),
): ObligationDto {
  // `dueDate` é gravado/lido sempre em UTC (meia-noite), então a fatia
  // YYYY-MM-DD do ISO string bate com a chave do mapa de feriados
  // (também YYYY-MM-DD) sem depender do fuso local do processo.
  const isoDay = obligation.dueDate.toISOString().slice(0, 10);
  return {
    id: obligation.id,
    title: obligation.title,
    type: obligation.type as ObligationType,
    customType: obligation.customType,
    dueDate: obligation.dueDate.toISOString(),
    status: obligation.status,
    recurrence: obligation.recurrence as Recurrence,
    recurrenceGroupId: obligation.recurrenceGroupId,
    collaborator: {
      id: obligation.collaborator.id,
      name: obligation.collaborator.name,
      color: obligation.collaborator.color,
    },
    company: obligation.company,
    overdue: obligation.status === 'pending' && obligation.dueDate < now,
    holidayConflict: holidays.get(isoDay) ?? null,
    createdAt: obligation.createdAt.toISOString(),
  };
}
