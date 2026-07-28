import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const portfolioQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  state: z.string().length(2).optional(),
  porte: z.string().optional(),
  situacao: z.string().optional(),
  cnae: z.string().optional(),
});
export type PortfolioQuery = z.infer<typeof portfolioQuerySchema>;

export interface Bucket {
  readonly label: string;
  readonly count: number;
}

export interface CnaeBucket extends Bucket {
  readonly descricao: string;
}

export interface PortfolioDto {
  readonly totals: { readonly companies: number; readonly irregulares: number };
  readonly byState: readonly Bucket[];
  readonly byPorte: readonly Bucket[];
  readonly byCnae: readonly CnaeBucket[];
  readonly bySituacao: readonly Bucket[];
  readonly byAge: readonly Bucket[];
}

const ACTIVE_SITUACAO = 'ATIVA';

// Ordem fixa + zero-fill: essas dimensões têm domínio conhecido, então
// aparecem sempre no gráfico (mesmo com contagem zero). Sem isso os gráficos
// "dançam" ao trocar de filtro na demo. Espelha o front (portfolio.service.ts).
const PORTE_ORDER = ['MEI', 'ME', 'EPP', 'DEMAIS'] as const;
const SITUACAO_ORDER = ['ATIVA', 'SUSPENSA', 'INAPTA', 'BAIXADA'] as const;

const AGE_BUCKETS = [
  { label: 'Menos de 1 ano', maxYears: 1 },
  { label: '1 a 5 anos', maxYears: 5 },
  { label: '5 a 10 anos', maxYears: 10 },
  { label: 'Mais de 10 anos', maxYears: Infinity },
] as const;

function yearsSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

/** Conta por rótulo, dado um domínio fixo — zero-fill das categorias ausentes. */
function toFixedOrderBuckets(
  counts: ReadonlyMap<string, number>,
  order: readonly string[],
): Bucket[] {
  return order.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

export interface OverviewDto {
  readonly companies: {
    readonly total: number;
    readonly active: number;
    readonly inactive: number;
    readonly pending: number;
  };
  readonly averageHealthScore: number;
}

export interface HealthScoreDto {
  readonly average: number;
  readonly distribution: {
    readonly healthy: number;
    readonly attention: number;
    readonly critical: number;
  };
}

function round(value: number | null): number {
  return Math.round(value ?? 0);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string): Promise<OverviewDto> {
    const [total, grouped, avg] = await Promise.all([
      this.prisma.company.count({ where: { tenantId } }),
      this.prisma.company.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
        orderBy: { status: 'asc' },
      }),
      this.prisma.company.aggregate({
        where: { tenantId },
        _avg: { healthScore: true },
      }),
    ]);

    const byStatus: Record<string, number> = {
      active: 0,
      inactive: 0,
      pending: 0,
    };
    for (const group of grouped) {
      if (group.status in byStatus) {
        byStatus[group.status] = group._count;
      }
    }

    return {
      companies: {
        total,
        active: byStatus.active,
        inactive: byStatus.inactive,
        pending: byStatus.pending,
      },
      averageHealthScore: round(avg._avg.healthScore),
    };
  }

  async getHealthScore(tenantId: string): Promise<HealthScoreDto> {
    const [avg, healthy, attention, critical] = await Promise.all([
      this.prisma.company.aggregate({
        where: { tenantId },
        _avg: { healthScore: true },
      }),
      this.prisma.company.count({
        where: { tenantId, healthScore: { gte: 80 } },
      }),
      this.prisma.company.count({
        where: { tenantId, healthScore: { gte: 50, lt: 80 } },
      }),
      this.prisma.company.count({
        where: { tenantId, healthScore: { lt: 50 } },
      }),
    ]);

    return {
      average: round(avg._avg.healthScore),
      distribution: { healthy, attention, critical },
    };
  }

  /**
   * Todas as agregações da composição da carteira em uma resposta.
   * Os cortes acontecem no banco (groupBy), nunca no Node e nunca no
   * browser — requisito de desempenho explícito do cliente. A única exceção
   * é `byAge`, que precisa de aritmética de data: buscamos só a coluna
   * `dataAbertura`, nunca as empresas inteiras.
   */
  async getPortfolio(
    tenantId: string,
    query: PortfolioQuery,
  ): Promise<PortfolioDto> {
    const where: Prisma.CompanyWhereInput = { tenantId };
    if (query.search) {
      // Mesma regra da listagem: no Postgres, `contains` diferencia
      // maiúsculas, então o filtro do dashboard precisa de `insensitive`
      // para concordar com a busca da tela de empresas.
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { tradeName: { contains: query.search, mode: 'insensitive' } },
        { cnpj: { contains: query.search } },
      ];
    }
    if (query.state) where.state = query.state;
    if (query.porte) where.porte = query.porte;
    if (query.situacao) where.situacaoCadastral = query.situacao;
    if (query.cnae) where.cnaeCodigo = query.cnae;

    const [total, irregulares, states, portes, situacoes, cnaes, aberturas] =
      await Promise.all([
        this.prisma.company.count({ where }),
        this.prisma.company.count({
          where: { ...where, NOT: { situacaoCadastral: ACTIVE_SITUACAO } },
        }),
        this.prisma.company.groupBy({ by: ['state'], where, _count: true }),
        this.prisma.company.groupBy({ by: ['porte'], where, _count: true }),
        this.prisma.company.groupBy({
          by: ['situacaoCadastral'],
          where,
          _count: true,
        }),
        this.prisma.company.groupBy({
          by: ['cnaeCodigo', 'cnaeDescricao'],
          where,
          _count: true,
        }),
        // Única agregação fora do groupBy: a idade exige aritmética de data
        // que o SQLite/Prisma não faz nativamente. Busca só a coluna
        // necessária — nunca as empresas inteiras.
        this.prisma.company.findMany({ where, select: { dataAbertura: true } }),
      ]);

    const now = new Date();
    const ageCounts = new Map<string, number>(
      AGE_BUCKETS.map((bucket) => [bucket.label, 0]),
    );
    for (const row of aberturas) {
      if (!row.dataAbertura) continue;
      const years = yearsSince(row.dataAbertura, now);
      const bucket =
        AGE_BUCKETS.find((b) => years < b.maxYears) ??
        AGE_BUCKETS[AGE_BUCKETS.length - 1];
      ageCounts.set(bucket.label, (ageCounts.get(bucket.label) ?? 0) + 1);
    }

    const porteCounts = new Map(
      portes.map((row) => [row.porte, row._count as number]),
    );
    const situacaoCounts = new Map(
      situacoes.map((row) => [row.situacaoCadastral, row._count as number]),
    );

    const byState: Bucket[] = states
      .map((row) => ({ label: row.state, count: row._count as number }))
      .filter((bucket) => bucket.label.length > 0)
      .sort((a, b) => b.count - a.count);

    const byCnae: CnaeBucket[] = cnaes
      .map((row) => ({
        label: row.cnaeCodigo,
        descricao: row.cnaeDescricao,
        count: row._count as number,
      }))
      .filter((bucket) => bucket.label.length > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totals: { companies: total, irregulares },
      byState,
      byPorte: toFixedOrderBuckets(porteCounts, PORTE_ORDER),
      byCnae,
      bySituacao: toFixedOrderBuckets(situacaoCounts, SITUACAO_ORDER),
      byAge: AGE_BUCKETS.map((bucket) => ({
        label: bucket.label,
        count: ageCounts.get(bucket.label) ?? 0,
      })),
    };
  }
}
