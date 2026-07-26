import { z } from 'zod';
import type { ActivityLog } from '@prisma/client';

export const listActivityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  entityType: z.string().optional(),
});
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;

export interface ActivityLogDto {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata: unknown | null;
  readonly createdAt: string;
}

function parseMetadata(raw: string | null): unknown {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function toActivityDto(log: ActivityLog): ActivityLogDto {
  return {
    id: log.id,
    actorId: log.actorId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: parseMetadata(log.metadata),
    createdAt: log.createdAt.toISOString(),
  };
}
