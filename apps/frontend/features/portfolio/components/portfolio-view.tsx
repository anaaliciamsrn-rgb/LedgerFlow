'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SearchBar } from '@/components/ui/search-bar';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { BucketChart } from '@/features/portfolio/components/bucket-chart';
import { usePortfolio } from '@/features/portfolio/hooks/use-portfolio';
import { useDebounce } from '@/hooks/use-debounce';

export function PortfolioView(): React.ReactNode {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = usePortfolio({
    search: debouncedSearch,
    state: state || undefined,
  });

  if (isError) {
    return <EmptyState icon={BarChart3} title="Erro ao carregar a carteira" description="Tente novamente em instantes." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Análise da carteira" description="Composição das empresas do escritório." />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <SearchBar value={search} onValueChange={setSearch} placeholder="Buscar empresa..." />
        </div>
        <select
          value={state}
          onChange={(event) => setState(event.target.value)}
          aria-label="Filtrar por estado"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos os estados</option>
          {(data?.byState ?? []).map((bucket) => (
            <option key={bucket.label} value={bucket.label}>{bucket.label}</option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Empresas na carteira" value={String(data.totals.companies)} />
            <StatCard title="Situação irregular" value={String(data.totals.irregulares)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BucketChart title="Empresas por estado" data={data.byState} />
            <BucketChart title="Distribuição por porte" data={data.byPorte} />
            <BucketChart title="Situação cadastral" data={data.bySituacao} />
            <BucketChart title="Tempo de abertura" data={data.byAge} />
            <div className="lg:col-span-2">
              <BucketChart
                title="Distribuição por CNAE (top 10)"
                data={data.byCnae.map((b) => ({ label: b.descricao || b.label, count: b.count }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
