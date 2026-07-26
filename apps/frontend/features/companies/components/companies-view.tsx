'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SearchBar } from '@/components/ui/search-bar';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { CompaniesTable } from '@/features/companies/components/companies-table';
import { useCompanies } from '@/features/companies/hooks/use-companies';
import { useDebounce } from '@/hooks/use-debounce';

export function CompaniesView(): React.ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = useCompanies({ page, search: debouncedSearch });

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" description="Gerencie as empresas da sua carteira." />
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