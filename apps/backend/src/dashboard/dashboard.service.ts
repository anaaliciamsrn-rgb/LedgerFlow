import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
