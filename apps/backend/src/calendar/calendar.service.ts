import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Obligation, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { HolidaysService } from '../brasil-api/holidays.service';
import { generateOccurrences } from './recurrence';
import {
  toObligationDto,
  type CreateObligationInput,
  type ListObligationsQuery,
  type ObligationDto,
  type UpdateObligationInput,
} from './calendar.schema';

const createRecurrenceGroupId = (): string => `rec_${randomUUID()}`;

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly holidays: HolidaysService,
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
    if (query.assignee) {
      where.assignee = query.assignee;
    }

    const rows = await this.prisma.obligation.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });

    const holidays = await this.holidaysForYearsOf(rows);
    const now = new Date();
    return rows.map((row) => toObligationDto(row, now, holidays));
  }

  /** Materializa as ocorrências da recorrência (decisão B1 da spec). */
  async create(
    tenantId: string,
    actorId: string,
    input: CreateObligationInput,
  ): Promise<ObligationDto[]> {
    const dates = generateOccurrences(
      input.dueDate,
      input.recurrence,
      input.occurrences,
    );
    const recurrenceGroupId =
      input.recurrence === 'none' ? null : createRecurrenceGroupId();

    await this.prisma.obligation.createMany({
      data: dates.map((dueDate) => ({
        tenantId,
        title: input.title,
        type: input.type,
        dueDate,
        companyId: input.companyId ?? null,
        assignee: input.assignee,
        recurrenceGroupId,
      })),
    });

    const created = await this.prisma.obligation.findMany({
      where: recurrenceGroupId
        ? { tenantId, recurrenceGroupId }
        : { tenantId, title: input.title, dueDate: dates[0] },
      orderBy: { dueDate: 'asc' },
    });

    await this.activity.record({
      tenantId,
      actorId,
      action: 'obligation.created',
      entityType: 'obligation',
      entityId: created[0]?.id ?? '',
      metadata: { occurrences: created.length, recurrence: input.recurrence },
    });

    const holidays = await this.holidaysForYearsOf(created);
    const now = new Date();
    return created.map((row) => toObligationDto(row, now, holidays));
  }

  /**
   * Busca os feriados uma vez por ano presente no resultado — o cache do
   * `HolidaysService` cuida de não repetir a chamada para o mesmo ano.
   * Se a BrasilAPI cair, `HolidaysService` devolve mapa vazio e
   * `holidayConflict` fica `null` em tudo; o calendário nunca lança por isso.
   */
  private async holidaysForYearsOf(
    rows: readonly Obligation[],
  ): Promise<Map<string, string>> {
    const years = [...new Set(rows.map((row) => row.dueDate.getUTCFullYear()))];
    const holidays = new Map<string, string>();
    for (const year of years) {
      for (const [date, name] of await this.holidays.listByYear(year)) {
        holidays.set(date, name);
      }
    }
    return holidays;
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
    const holidays = await this.holidaysForYearsOf([obligation]);
    return toObligationDto(obligation, new Date(), holidays);
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
