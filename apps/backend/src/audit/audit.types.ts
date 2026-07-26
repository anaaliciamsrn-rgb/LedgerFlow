import { z } from 'zod';
import type { AuditFinding, AuditRun } from '@prisma/client';
import type { AuditStatus, Severity } from './audit-engine';

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

export interface AuditFindingDto {
  readonly code: string;
  readonly severity: Severity;
  readonly message: string;
  readonly passed: boolean;
}

export interface AuditRunSummaryDto {
  readonly id: string;
  readonly companyId: string;
  readonly score: number;
  readonly status: AuditStatus;
  readonly findingsCount: number;
  readonly createdAt: string;
}

export interface AuditRunDetailDto extends AuditRunSummaryDto {
  readonly findings: readonly AuditFindingDto[];
}

export function toSummaryDto(
  run: AuditRun & { _count: { findings: number } },
): AuditRunSummaryDto {
  return {
    id: run.id,
    companyId: run.companyId,
    score: run.score,
    status: run.status as AuditStatus,
    findingsCount: run._count.findings,
    createdAt: run.createdAt.toISOString(),
  };
}

export function toDetailDto(
  run: AuditRun & { findings: AuditFinding[] },
): AuditRunDetailDto {
  return {
    id: run.id,
    companyId: run.companyId,
    score: run.score,
    status: run.status as AuditStatus,
    findingsCount: run.findings.length,
    createdAt: run.createdAt.toISOString(),
    findings: run.findings.map((f) => ({
      code: f.code,
      severity: f.severity as Severity,
      message: f.message,
      passed: f.passed,
    })),
  };
}
