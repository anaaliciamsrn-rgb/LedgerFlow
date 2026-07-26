'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { CompanyStatusBadge } from '@/features/companies/components/company-status-badge';
import { formatCNPJ, formatPhone } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import type { Company } from '@/features/companies/types/company.types';

interface CompaniesTableProps {
  readonly data: readonly Company[];
  readonly isLoading: boolean;
}

const columns: readonly DataTableColumn<Company>[] = [
  { id: 'name', header: 'Empresa', cell: (row) => (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{row.name}</span>
      <span className="text-xs text-muted-foreground">{row.tradeName}</span>
    </div>
  ) },
  { id: 'cnpj', header: 'CNPJ', cell: (row) => formatCNPJ(row.cnpj) },
  { id: 'contact', header: 'Contato', cell: (row) => (
    <div className="flex flex-col">
      <span>{row.email}</span>
      <span className="text-xs text-muted-foreground">{formatPhone(row.phone)}</span>
    </div>
  ) },
  { id: 'location', header: 'Localização', cell: (row) => `${row.city}/${row.state}` },
  { id: 'status', header: 'Status', cell: (row) => <CompanyStatusBadge status={row.status} /> },
];

export function CompaniesTable({ data, isLoading }: CompaniesTableProps): React.ReactNode {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      emptyTitle="Nenhuma empresa encontrada"
      emptyDescription="Cadastre uma empresa ou ajuste os filtros de busca."
      onRowClick={(row) => router.push(ROUTES.companies.detail(row.id))}
    />
  );
}