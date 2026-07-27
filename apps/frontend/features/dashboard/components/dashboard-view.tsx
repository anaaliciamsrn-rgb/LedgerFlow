'use client';

import { useState } from 'react';
import { Building2, AlertTriangle, CheckCircle2, Landmark, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SearchBar } from '@/components/ui/search-bar';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { usePortfolio } from '@/features/portfolio/hooks/use-portfolio';
import { useDebounce } from '@/hooks/use-debounce';
import { StatusDonutChart } from '@/features/dashboard/components/status-donut-chart';
import { StateBarChart } from '@/features/dashboard/components/state-bar-chart';
import { HealthAreaChart } from '@/features/dashboard/components/health-area-chart';
import { SizeBarChart } from '@/features/dashboard/components/size-bar-chart';
import { CnaeBarChart } from '@/features/dashboard/components/cnae-bar-chart';
import type { Bucket } from '@/features/portfolio/types/portfolio.types';

const ACTIVE_LABEL = 'ATIVA';

function ChartCard({ title, children }: { readonly title: string; readonly children: React.ReactNode }): React.ReactNode {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-elevation-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function activeCount(buckets: readonly Bucket[]): number {
  return buckets.find((b) => b.label === ACTIVE_LABEL)?.count ?? 0;
}

export function DashboardView(): React.ReactNode {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError } = usePortfolio({ search: debouncedSearch || undefined });

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Análise da carteira" description="Composição das empresas do escritório." />
        <EmptyState icon={AlertTriangle} title="Erro ao carregar o dashboard" description="Tente novamente em instantes." />
      </div>
    );
  }

  const totalCompanies = data?.totals.companies ?? 0;
  const irregulares = data?.totals.irregulares ?? 0;
  const ativas = data ? activeCount(data.bySituacao) : 0;
  const estados = data ? data.byState.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Análise da carteira" description="Composição das empresas do escritório." />

      <div className="max-w-sm">
        <SearchBar value={search} onValueChange={setSearch} placeholder="Buscar por nome ou CNPJ..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Empresas na carteira" value={String(totalCompanies)} icon={Building2} isLoading={isLoading} />
        <StatCard title="Situação ativa" value={String(ativas)} icon={CheckCircle2} isLoading={isLoading} />
        <StatCard title="Situação irregular" value={String(irregulares)} icon={AlertTriangle} isLoading={isLoading} />
        <StatCard title="Estados atendidos" value={String(estados)} icon={Landmark} isLoading={isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Situação cadastral">
          {isLoading || !data ? <Skeleton className="h-[240px] w-full" /> : <StatusDonutChart data={data.bySituacao} />}
        </ChartCard>
        <ChartCard title="Empresas por estado">
          {isLoading || !data ? <Skeleton className="h-[280px] w-full" /> : <StateBarChart data={data.byState} />}
        </ChartCard>
        <ChartCard title="Distribuição por porte">
          {isLoading || !data ? <Skeleton className="h-[240px] w-full" /> : <SizeBarChart data={data.byPorte} />}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tempo de abertura das empresas">
          {isLoading || !data ? <Skeleton className="h-[240px] w-full" /> : <HealthAreaChart data={data.byAge} />}
        </ChartCard>
        <ChartCard title="Distribuição por CNAE (top 10)">
          {isLoading || !data ? (
            <Skeleton className="h-[240px] w-full" />
          ) : data.byCnae.length === 0 ? (
            <EmptyState icon={BarChart3} title="Sem dados de CNAE" />
          ) : (
            <CnaeBarChart data={data.byCnae.map((b) => ({ label: b.descricao || b.label, count: b.count }))} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
