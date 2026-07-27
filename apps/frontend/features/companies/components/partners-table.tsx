import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Partner } from '@/features/companies/types/company.types';

interface PartnersTableProps {
  readonly partners: readonly Partner[];
}

export function PartnersTable({ partners }: PartnersTableProps): React.ReactNode {
  if (partners.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sem quadro societário"
        description="A Receita Federal não retornou sócios para este CNPJ."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Qualificação</TableHead>
          <TableHead className="hidden sm:table-cell">Faixa etária</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {partners.map((partner) => (
          <TableRow key={partner.id}>
            <TableCell className="font-medium">{partner.nome}</TableCell>
            <TableCell>{partner.qualificacao}</TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">
              {partner.faixaEtaria ?? '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
