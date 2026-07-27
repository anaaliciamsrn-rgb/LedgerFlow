'use client';

import { useState } from 'react';
import { Search, Loader2, Building2, MapPin, Users, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RegistrationStatusBadge } from '@/features/companies/components/registration-status-badge';
import { useCnpjLookup } from '@/features/companies/hooks/use-cnpj-lookup';
import { isValidCNPJ } from '@/utils/validation';
import { formatCNPJ, formatCEP, formatPhone } from '@/utils/format';
import { toast } from '@/components/ui/toast';
import type { CnpjLookupResult } from '@/features/companies/schemas/cnpj-lookup.schema';

const SIZE_LABELS: Record<string, string> = {
  MEI: 'Microempreendedor Individual',
  ME: 'Microempresa',
  EPP: 'Empresa de Pequeno Porte',
  DEMAIS: 'Demais',
};

function InfoRow({ label, value }: { readonly label: string; readonly value: string }): React.ReactNode {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function ResultView({ data }: { readonly data: CnpjLookupResult }): React.ReactNode {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{data.legalName}</p>
          <p className="text-sm text-muted-foreground">{data.tradeName}</p>
          <p className="text-xs text-muted-foreground">{formatCNPJ(data.cnpj)}</p>
        </div>
        <RegistrationStatusBadge status={data.registrationStatus} />
      </div>

      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 className="size-4 text-muted-foreground" /> Dados cadastrais
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Porte" value={SIZE_LABELS[data.size] ?? data.size} />
          <InfoRow label="Abertura" value={new Date(data.openingDate).toLocaleDateString('pt-BR')} />
          <InfoRow label="CNAE" value={data.mainActivity.code} />
          <InfoRow label="Atividade" value={data.mainActivity.description} />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="size-4 text-muted-foreground" /> Endereço
        </h4>
        <p className="text-sm text-foreground">
          {data.address.street}, {data.address.number} — {data.address.district}
          <br />
          {data.address.city}/{data.address.state} · {formatCEP(data.address.zipCode)}
        </p>
      </section>

      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="size-4 text-muted-foreground" /> Quadro societário
        </h4>
        <div className="space-y-2">
          {data.partners.map((partner) => (
            <div key={partner.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{partner.name}</p>
                <p className="text-xs text-muted-foreground">{partner.role}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                desde {new Date(partner.since).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function CnpjOnboardingDialog(): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [touched, setTouched] = useState(false);
  const lookup = useCnpjLookup();

  const digits = cnpj.replace(/\D/g, '');
  const isValid = isValidCNPJ(digits);
  const showError = touched && digits.length > 0 && !isValid;

  function handleLookup(): void {
    setTouched(true);
    if (!isValid) {
      return;
    }
    lookup.mutate(digits);
  }

  function handleSave(): void {
    toast.success('Empresa salva com sucesso', {
      description: 'Os dados foram adicionados à sua carteira.',
    });
    setOpen(false);
    setCnpj('');
    lookup.reset();
  }

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) {
      setCnpj('');
      setTouched(false);
      lookup.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Building2 className="size-4" />
          Nova empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar empresa por CNPJ</DialogTitle>
          <DialogDescription>
            Informe o CNPJ para consultar os dados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={formatCNPJ(cnpj)}
                onChange={(event) => setCnpj(event.target.value)}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                aria-label="CNPJ"
                aria-invalid={showError ? true : undefined}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleLookup();
                  }
                }}
              />
            </div>
            <Button onClick={handleLookup} disabled={lookup.isPending}>
              {lookup.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Consultar
            </Button>
          </div>
          {showError ? <p className="text-sm text-destructive">CNPJ inválido. Verifique os dígitos.</p> : null}
        </div>

        {lookup.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}

        {lookup.isError ? (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Não foi possível consultar este CNPJ. Tente novamente.
          </div>
        ) : null}

        {lookup.data ? (
          <>
            <ResultView data={lookup.data} />
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave}>
                <Save className="size-4" />
                Salvar empresa
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
