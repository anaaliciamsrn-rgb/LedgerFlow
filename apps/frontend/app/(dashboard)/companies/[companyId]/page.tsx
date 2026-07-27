import type { ReactNode } from 'react';
import { CompanyDetailView } from '@/features/companies/components/company-detail-view';

interface CompanyDetailPageProps {
  readonly params: Promise<{ readonly companyId: string }>;
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps): Promise<ReactNode> {
  const { companyId } = await params;

  return <CompanyDetailView companyId={companyId} />;
}
