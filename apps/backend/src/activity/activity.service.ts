import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginated, type Paginated } from '../common/pagination';
import {
  toActivityDto,
  type ActivityLogDto,
  type ListActivityQuery,
} from './activity.types';

export interface RecordActivityInput {
  readonly tenantId: string;
  readonly actorId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Registro append-only de eventos de domínio por tenant.
 * Chamado pelos demais módulos (Companies, etc.) após mutações.
 */
@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordActivityInput): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  }

  async list(
    tenantId: string,
    query: ListActivityQuery,
  ): Promise<Paginated<ActivityLogDto>> {
    const { page, pageSize, entityType } = query;
    const where: Prisma.ActivityLogWhereInput = { tenantId };
    if (entityType) {
      where.entityType = entityType;
    }

    const [total, rows] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return paginated(rows.map(toActivityDto), page, pageSize, total);
  }
}
