import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { CompanyStatusBadge } from '@/features/companies/components/company-status-badge';
import { PartnersTable } from '@/features/companies/components/partners-table';
import { formatCEP, formatCNPJ, formatDate, formatPhone } from '@/utils/format';
import type { Company } from '@/features/companies/types/company.types';

interface CompanyDetailCardProps {
  readonly company: Company;
}

type SituacaoVariant = 'success' | 'warning' | 'destructive' | 'secondary';

const SITUACAO_VARIANT: Record<string, SituacaoVariant> = {
  ATIVA: 'success',
  SUSPENSA: 'warning',
  INAPTA: 'warning',
  BAIXADA: 'destructive',
  NULA: 'destructive',
};

function situacaoVariant(situacao: string): SituacaoVariant {
  return SITUACAO_VARIANT[situacao.trim().toUpperCase()] ?? 'secondary';
}

export function CompanyDetailCard({ company }: CompanyDetailCardProps): React.ReactNode {
  const endereco = [company.logradouro, company.numero, company.complemento].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>{company.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{company.tradeName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CompanyStatusBadge status={company.status} />
            {company.situacaoCadastral ? (
              <Badge variant={situacaoVariant(company.situacaoCadastral)}>{company.situacaoCadastral}</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="CNPJ" value={formatCNPJ(company.cnpj)} />
          <Field label="Porte" value={company.porte || '—'} />
          <Field label="CNAE" value={company.cnaeCodigo ? `${company.cnaeCodigo} — ${company.cnaeDescricao}` : '—'} />
          <Field label="Natureza jurídica" value={company.naturezaJuridica ?? '—'} />
          <Field label="Data de abertura" value={company.dataAbertura ? formatDate(company.dataAbertura) : '—'} />
          <Field label="E-mail" value={company.email || '—'} />
          <Field label="Telefone" value={company.phone ? formatPhone(company.phone) : '—'} />
          <Field
            label="Endereço"
            value={endereco ? `${endereco} — ${company.bairro}, ${company.city}/${company.state}` : '—'}
          />
          <Field label="CEP" value={company.cep ? formatCEP(company.cep) : '—'} />
        </CardContent>
      </Card>

      <StatCard title="Score de auditoria" value={`${company.healthScore}/100`} icon={Building2} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quadro societário</CardTitle>
        </CardHeader>
        <CardContent>
          <PartnersTable partners={company.partners} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: string }): React.ReactNode {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
