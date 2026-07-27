'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { companiesService } from '@/features/companies/services/companies.service';
import type { CnpjLookup } from '@/features/companies/types/company.types';

interface CnpjLookupFormProps {
  readonly onSaved: () => void;
}

export function CnpjLookupForm({ onSaved }: CnpjLookupFormProps): React.ReactNode {
  const [cnpj, setCnpj] = useState('');
  const [preview, setPreview] = useState<CnpjLookup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await companiesService.lookupCnpj(cnpj.replace(/\D/g, ''));
      if (result === null) {
        setError('CNPJ não encontrado na Receita Federal.');
        return;
      }
      setPreview(result);
    } catch {
      setError('Não foi possível consultar o CNPJ. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(): Promise<void> {
    if (!preview) return;
    setIsLoading(true);
    try {
      await companiesService.create({
        name: preview.razaoSocial,
        tradeName: preview.nomeFantasia || preview.razaoSocial,
        cnpj: preview.cnpj,
        status: 'pending',
        email: preview.email ?? '',
        phone: preview.telefone ?? '',
        logradouro: preview.logradouro,
        numero: preview.numero,
        complemento: preview.complemento,
        bairro: preview.bairro,
        cep: preview.cep,
        city: preview.municipio,
        state: preview.uf,
      });
      setPreview(null);
      setCnpj('');
      onSaved();
    } catch {
      setError('Não foi possível salvar a empresa.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={cnpj}
          onChange={(event) => setCnpj(event.target.value)}
          placeholder="Informe o CNPJ"
          aria-label="CNPJ"
          className="sm:max-w-xs"
        />
        <Button onClick={handleLookup} disabled={isLoading || cnpj.replace(/\D/g, '').length !== 14}>
          <Search className="mr-2 size-4" aria-hidden />
          Consultar
        </Button>
      </div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      {preview ? (
        <Card className="space-y-3 p-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Razão social" value={preview.razaoSocial} />
            <Field label="Nome fantasia" value={preview.nomeFantasia || '—'} />
            <Field label="Situação cadastral" value={preview.situacao} />
            <Field label="Porte" value={preview.porte || '—'} />
            <Field label="CNAE" value={`${preview.cnaeCodigo} — ${preview.cnaeDescricao}`} />
            <Field label="Abertura" value={preview.dataAbertura ?? '—'} />
            <Field
              label="Endereço"
              value={`${preview.logradouro}, ${preview.numero} — ${preview.bairro}, ${preview.municipio}/${preview.uf}`}
            />
            <Field label="Sócios" value={String(preview.socios.length)} />
          </dl>
          <Button onClick={handleSave} disabled={isLoading}>Salvar empresa</Button>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: string }): React.ReactNode {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
