import { Injectable, NotFoundException } from '@nestjs/common';
import type { Obligation, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  toObligationDto,
  type CreateObligationInput,
  type ListObligationsQuery,
  type ObligationDto,
  type UpdateObligationInput,
} from './calendar.schema';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(
    tenantId: string,
    query: ListObligationsQuery,
  ): Promise<ObligationDto[]> {
    const where: Prisma.ObligationWhereInput = { tenantId };
    if (query.from || query.to) {
      where.dueDate = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.status) {
      where.status = query.status;
    }

    const rows = await this.prisma.obligation.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });
    const now = new Date();
    return rows.map((row) => toObligationDto(row, now));
  }

  async create(
    tenantId: string,
    actorId: string,
    input: CreateObligationInput,
  ): Promise<ObligationDto> {
    const obligation = await this.prisma.obligation.create({
      data: {
        tenantId,
        title: input.title,
        type: input.type,
        dueDate: input.dueDate,
        companyId: input.companyId ?? null,
      },
    });
    await this.activity.record({
      tenantId,
      actorId,
      action: 'obligation.created',
      entityType: 'obligation',
      entityId: obligation.id,
    });
    return toObligationDto(obligation);
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    input: UpdateObligationInput,
  ): Promise<ObligationDto> {
    await this.ensureOwned(tenantId, id);
    const obligation = await this.prisma.obligation.update({
      where: { id },
      data: input,
    });
    await this.activity.record({
      tenantId,
      actorId,
      action: 'obligation.updated',
      entityType: 'obligation',
      entityId: id,
    });
    return toObligationDto(obligation);
  }

  private async ensureOwned(
    tenantId: string,
    id: string,
  ): Promise<Obligation> {
    const obligation = await this.prisma.obligation.findFirst({
      where: { id, tenantId },
    });
    if (!obligation) {
      throw new NotFoundException('Obrigação não encontrada');
    }
    return obligation;
  }
}
