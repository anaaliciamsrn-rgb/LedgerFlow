'use client';

import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { CompanyDetailCard } from '@/features/companies/components/company-detail-card';
import { useCompany } from '@/features/companies/hooks/use-company';

interface CompanyDetailViewProps {
  readonly companyId: string;
}

export function CompanyDetailView({
  companyId,
}: CompanyDetailViewProps): React.ReactNode {
  const { data, isLoading, isError } = useCompany(companyId);

  if (isError) {
    return (
      <EmptyState
        icon={Building2}
        title="Empresa não encontrada"
        description="Verifique o endereço ou volte para a listagem de empresas."
      />
    );
  }

  if (isLoading || !data) {
    return <Loading />;
  }

  return <CompanyDetailCard company={data} />;
}
