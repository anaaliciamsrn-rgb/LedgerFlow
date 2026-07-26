import type { QueryParams } from '@/types/common.types';

type TenantId = string;

export const queryKeys = {
  companies: {
    all: (tenantId: TenantId) => ['companies', tenantId] as const,
    list: (tenantId: TenantId, params?: QueryParams) =>
      ['companies', tenantId, 'list', params ?? {}] as const,
    detail: (tenantId: TenantId, companyId: string) =>
      ['companies', tenantId, 'detail', companyId] as const,
  },
  dashboard: {
    all: (tenantId: TenantId) => ['dashboard', tenantId] as const,
    overview: (tenantId: TenantId) =>
      ['dashboard', tenantId, 'overview'] as const,
    healthScore: (tenantId: TenantId) =>
      ['dashboard', tenantId, 'health-score'] as const,
  },
  audit: {
    all: (tenantId: TenantId) => ['audit', tenantId] as const,
    list: (tenantId: TenantId, params?: QueryParams) =>
      ['audit', tenantId, 'list', params ?? {}] as const,
    detail: (tenantId: TenantId, auditId: string) =>
      ['audit', tenantId, 'detail', auditId] as const,
  },
  calendar: {
    all: (tenantId: TenantId) => ['calendar', tenantId] as const,
    obligations: (tenantId: TenantId, params?: QueryParams) =>
      ['calendar', tenantId, 'obligations', params ?? {}] as const,
  },
  activity: {
    all: (tenantId: TenantId) => ['activity', tenantId] as const,
    feed: (tenantId: TenantId, params?: QueryParams) =>
      ['activity', tenantId, 'feed', params ?? {}] as const,
  },
  import: {
    all: (tenantId: TenantId) => ['import', tenantId] as const,
    jobs: (tenantId: TenantId) => ['import', tenantId, 'jobs'] as const,
    job: (tenantId: TenantId, jobId: string) =>
      ['import', tenantId, 'job', jobId] as const,
  },
} as const;