import { z } from 'zod';
import type { Collaborator } from '@prisma/client';

/**
 * Paleta fixa. Guardamos o **token**, nunca um hex: assim o tema claro/escuro
 * continua governando a aparência e o dado não carrega decisão visual.
 * A tradução para classes acontece no frontend
 * (`features/calendar/lib/collaborator-colors.ts`).
 */
export const collaboratorColorSchema = z.enum([
  'blue',
  'violet',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'orange',
  'lime',
]);
export type CollaboratorColor = z.infer<typeof collaboratorColorSchema>;

export const COLLABORATOR_COLORS: readonly CollaboratorColor[] =
  collaboratorColorSchema.options;

export const createCollaboratorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(60, 'Nome muito longo'),
  color: collaboratorColorSchema,
});
export type CreateCollaboratorInput = z.infer<typeof createCollaboratorSchema>;

export const updateCollaboratorSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nome é obrigatório')
      .max(60, 'Nome muito longo')
      .optional(),
    color: collaboratorColorSchema.optional(),
    active: z.boolean().optional(),
  })
  .strict();
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;

export interface CollaboratorDto {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly active: boolean;
  readonly createdAt: string;
}

export function toCollaboratorDto(row: Collaborator): CollaboratorDto {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}
