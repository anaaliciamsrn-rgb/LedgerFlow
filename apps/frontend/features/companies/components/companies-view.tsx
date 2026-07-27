'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { SearchBar } from '@/components/ui/search-bar';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { CompaniesTable } from '@/features/companies/components/companies-table';
import { CnpjLookupForm } from '@/features/companies/components/cnpj-lookup-form';
import { useCompanies } from '@/features/companies/hooks/use-companies';
import { useDebounce } from '@/hooks/use-debounce';
import { useTenant } from '@/features/auth/hooks/use-tenant';
import { queryKeys } from '@/constants/query-keys';

export function CompaniesView(): React.ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data, isLoading, isError } = useCompanies({ page, search: debouncedSearch });

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handleCompanySaved(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all(tenantId) });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" description="Gerencie as empresas da sua carteira." />
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Cadastrar empresa por CNPJ</h2>
        <CnpjLookupForm onSaved={handleCompanySaved} />
      </Card>
      <div className="max-w-sm">
        <SearchBar value={search} onValueChange={handleSearchChange} placeholder="Buscar por nome ou CNPJ..." />
      </div>
      {isError ? (
        <EmptyState icon={Building2} title="Erro ao carregar empresas" description="Tente novamente em instantes." />
      ) : (
        <>
          <CompaniesTable data={data?.data ?? []} isLoading={isLoading} />
          {data ? <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} /> : null}
        </>
      )}
    </div>
  );
}