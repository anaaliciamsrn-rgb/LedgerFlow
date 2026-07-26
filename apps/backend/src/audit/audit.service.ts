import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { paginated, type Paginated } from '../common/pagination';
import { runAudit } from './audit-engine';
import {
  toDetailDto,
  toSummaryDto,
  type AuditRunDetailDto,
  type AuditRunSummaryDto,
  type ListAuditQuery,
} from './audit.types';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async runForCompany(
    tenantId: string,
    actorId: string,
    companyId: string,
  ): Promise<AuditRunDetailDto> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const result = runAudit(company);

    const run = await this.prisma.auditRun.create({
      data: {
        tenantId,
        companyId,
        score: result.score,
        status: result.status,
        findings: {
          create: result.findings.map((f) => ({
            code: f.code,
            severity: f.severity,
            message: f.message,
            passed: f.passed,
          })),
        },
      },
      include: { findings: true },
    });

    await this.prisma.company.update({
      where: { id: companyId },
      data: { healthScore: result.score },
    });

    await this.activity.record({
      tenantId,
      actorId,
      action: 'audit.completed',
      entityType: 'company',
      entityId: companyId,
      metadata: { score: result.score, status: result.status },
    });

    return toDetailDto(run);
  }

  async list(
    tenantId: string,
    query: ListAuditQuery,
  ): Promise<Paginated<AuditRunSummaryDto>> {
    const { page, pageSize } = query;
    const where = { tenantId };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditRun.count({ where }),
      this.prisma.auditRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { findings: true } } },
      }),
    ]);

    return paginated(rows.map(toSummaryDto), page, pageSize, total);
  }

  async getById(tenantId: string, id: string): Promise<AuditRunDetailDto> {
    const run = await this.prisma.auditRun.findFirst({
      where: { id, tenantId },
      include: { findings: true },
    });
    if (!run) {
      throw new NotFoundException('Auditoria não encontrada');
    }
    return toDetailDto(run);
  }
}
