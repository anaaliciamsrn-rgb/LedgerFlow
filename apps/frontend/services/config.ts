import { env } from '@/lib/env';

interface FeatureFlags {
  readonly aiSummaries: boolean;
  readonly bulkImport: boolean;
  readonly auditModule: boolean;
  readonly calendarModule: boolean;
  readonly activityFeed: boolean;
}

interface AppConfig {
  readonly useMocks: boolean;
  readonly apiBaseUrl: string;
  readonly timeout: number;
  readonly features: FeatureFlags;
}

export const config: AppConfig = {
  useMocks: env.NEXT_PUBLIC_USE_MOCKS,
  apiBaseUrl: env.NEXT_PUBLIC_API_URL,
  timeout: env.NEXT_PUBLIC_API_TIMEOUT,
  features: {
    aiSummaries: true,
    bulkImport: true,
    auditModule: true,
    calendarModule: true,
    activityFeed: true,
  },
} as const;