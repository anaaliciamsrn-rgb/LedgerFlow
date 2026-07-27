import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { HolidaysService } from '../brasil-api/holidays.service';
import { generateOccurrences } from './recurrence';
import { previousBusinessDay } from './business-days';
import {
  toObligationDto,
  type CreateObligationInput,
  type HolidayDto,
  type ListObligationsQuery,
  type ObligationDto,
  type ObligationWithRelations,
  type UpdateObligationInput,
} from './calendar.schema';

const createRecurrenceGroupId = (): string => `rec_${randomUUID()}`;

/** A faixa de atrasadas é um alerta, não uma listagem completa. */
const OVERDUE_LIMIT = 100;

/** Traz responsável e empresa junto — o DTO precisa dos dois. */
const WITH_RELATIONS = {
  collaborator: true,
  company: { select: { id: true, name: true } },
} as const;

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
    const now = new Date();

    // `overdueOnly` é um modo próprio: ignora o intervalo do mês exibido,
    // porque a faixa do topo mostra atraso de qualquer mês.
    const where: Prisma.ObligationWhereInput = query.overdueOnly
      ? { tenantId, status: 'pending', dueDate: { lt: now } }
      : this.buildRangeWhere(tenantId, query);

    const rows = await this.prisma.obligation.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: WITH_RELATIONS,
      ...(query.overdueOnly ? { take: OVERDUE_LIMIT } : {}),
    });

    const holidays = await this.holidaysForYearsOf(rows);
    return rows.map((row) => toObligationDto(row, now, holidays));
  }

  private buildRangeWhere(
    tenantId: string,
    query: ListObligationsQuery,
  ): Prisma.ObligationWhereInput {
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
    if (query.collaboratorId) {
      where.collaboratorId = query.collaboratorId;
    }
    return where;
  }

  /**
   * Feriados do ano para o formulário avisar antes de salvar.
   * `HolidaysService` já cacheia por ano e devolve mapa vazio se a BrasilAPI
   * cair — nesse caso a rota responde `[]` e o formulário simplesmente não
   * mostra aviso.
   */
  async listHolidays(year: number): Promise<HolidayDto[]> {
    const holidays = await this.holidays.listByYear(year);
    return [...holidays.entries()]
      .map(([date, name]) => ({ date, name }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Materializa as ocorrências da recorrência (decisão B1 da spec). */
  async create(
    tenantId: string,
    actorId: string,
    input: CreateObligationInput,
  ): Promise<ObligationDto[]> {
    await this.ensureCollaborator(tenantId, input.collaboratorId);

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
        customType: input.customType ?? null,
        dueDate,
        companyId: input.companyId ?? null,
        collaboratorId: input.collaboratorId,
        recurrence: input.recurrence,
        recurrenceGroupId,
      })),
    });

    const created = await this.prisma.obligation.findMany({
      where: recurrenceGroupId
        ? { tenantId, recurrenceGroupId }
        : { tenantId, title: input.title, dueDate: dates[0] },
      orderBy: { dueDate: 'asc' },
      include: WITH_RELATIONS,
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

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    input: UpdateObligationInput,
  ): Promise<ObligationDto> {
    const current = await this.ensureOwned(tenantId, id);
    const { action, ...fields } = input;

    const data: Prisma.ObligationUpdateInput = { ...fields };
    if (action === 'anticipate') {
      data.dueDate = await this.anticipate(current.dueDate);
    }

    const obligation = await this.prisma.obligation.update({
      where: { id },
      data,
      include: WITH_RELATIONS,
    });

    await this.activity.record({
      tenantId,
      actorId,
      action:
        action === 'anticipate'
          ? 'obligation.anticipated'
          : 'obligation.updated',
      entityType: 'obligation',
      entityId: id,
    });

    const holidays = await this.holidaysForYearsOf([obligation]);
    return toObligationDto(obligation, new Date(), holidays);
  }

  /**
   * Carrega o ano do vencimento **e o anterior**: antecipar 1º de janeiro
   * cai em 31 de dezembro do ano passado, cujos feriados precisam ser
   * conhecidos para não parar em cima de um.
   */
  private async anticipate(dueDate: Date): Promise<Date> {
    const year = dueDate.getUTCFullYear();
    const dates = new Set<string>();
    for (const alvo of [year, year - 1]) {
      for (const date of (await this.holidays.listByYear(alvo)).keys()) {
        dates.add(date);
      }
    }
    return previousBusinessDay(dueDate, dates);
  }

  /**
   * Busca os feriados uma vez por ano presente no resultado — o cache do
   * `HolidaysService` cuida de não repetir a chamada para o mesmo ano.
   * Se a BrasilAPI cair, `HolidaysService` devolve mapa vazio e
   * `holidayConflict` fica `null` em tudo; o calendário nunca lança por isso.
   */
  private async holidaysForYearsOf(
    rows: ReadonlyArray<{ dueDate: Date }>,
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

  /** Id de outro escritório nunca pode virar vínculo. */
  private async ensureCollaborator(
    tenantId: string,
    collaboratorId: string,
  ): Promise<void> {
    const found = await this.prisma.collaborator.findFirst({
      where: { id: collaboratorId, tenantId },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Responsável não encontrado');
    }
  }

  private async ensureOwned(
    tenantId: string,
    id: string,
  ): Promise<ObligationWithRelations> {
    const obligation = await this.prisma.obligation.findFirst({
      where: { id, tenantId },
      include: WITH_RELATIONS,
    });
    if (!obligation) {
      throw new NotFoundException('Obrigação não encontrada');
    }
    return obligation;
  }
}
