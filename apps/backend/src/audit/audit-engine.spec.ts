import {
  runAudit,
  normalizeName,
  type AuditableCompany,
  type AuditContext,
} from './audit-engine';
import type { CnpjInfo } from '../brasil-api/brasil-api.types';

const company: AuditableCompany = {
  cnpj: '33000167000101',
  name: 'PETROLEO BRASILEIRO S A PETROBRAS',
  situacaoCadastral: 'ATIVA',
  email: 'contato@petrobras.com.br',
  phone: '2132242000',
  cnaeCodigo: '1921700',
  porte: 'DEMAIS',
  logradouro: 'REPUBLICA DO CHILE',
  numero: '65',
  bairro: 'CENTRO',
  cep: '20031912',
  city: 'Rio de Janeiro',
  state: 'RJ',
};

const official: CnpjInfo = {
  cnpj: '33000167000101',
  razaoSocial: 'PETROLEO BRASILEIRO S A PETROBRAS',
  nomeFantasia: 'PETROBRAS',
  situacao: 'ATIVA',
  cnaeCodigo: '1921700',
  cnaeDescricao: 'Refino',
  porte: 'DEMAIS',
  naturezaJuridica: null,
  dataAbertura: '1953-10-03',
  logradouro: 'REPUBLICA DO CHILE',
  numero: '65',
  complemento: null,
  bairro: 'CENTRO',
  cep: '20031912',
  municipio: 'RIO DE JANEIRO',
  uf: 'RJ',
  email: null,
  telefone: null,
  socios: [],
};

const clean: AuditContext = { official, duplicateOf: [] };

function find(result: ReturnType<typeof runAudit>, code: string) {
  const finding = result.findings.find((f) => f.code === code);
  if (!finding) throw new Error(`Regra ausente: ${code}`);
  return finding;
}

describe('runAudit', () => {
  it('empresa em ordem passa em todas as regras com score 100', () => {
    const result = runAudit(company, clean);

    expect(result.score).toBe(100);
    expect(result.status).toBe('healthy');
    expect(result.findings).toHaveLength(6);
    expect(result.findings.every((f) => f.result === 'passed')).toBe(true);
  });

  it('detecta CNPJ com dígito verificador inválido', () => {
    const result = runAudit({ ...company, cnpj: '12345678000190' }, clean);

    expect(find(result, 'cnpj_invalido').result).toBe('failed');
    expect(result.status).toBe('critical');
  });

  it('detecta empresa duplicada', () => {
    const result = runAudit(company, { official, duplicateOf: ['cmp_outra'] });

    expect(find(result, 'empresa_duplicada').result).toBe('failed');
  });

  it('detecta razão social divergente da Receita', () => {
    const result = runAudit({ ...company, name: 'NOME ERRADO LTDA' }, clean);

    expect(find(result, 'razao_social_divergente').result).toBe('failed');
  });

  it('ignora diferença de acento e caixa na razão social', () => {
    const result = runAudit(
      { ...company, name: 'petroleo brasileiro s a petrobrás' },
      clean,
    );

    expect(find(result, 'razao_social_divergente').result).toBe('passed');
  });

  it('detecta endereço desatualizado', () => {
    const result = runAudit({ ...company, cep: '99999999' }, clean);

    expect(find(result, 'endereco_desatualizado').result).toBe('failed');
  });

  it('detecta situação cadastral irregular', () => {
    const result = runAudit(
      { ...company, situacaoCadastral: 'BAIXADA' },
      { official: { ...official, situacao: 'BAIXADA' }, duplicateOf: [] },
    );

    expect(find(result, 'situacao_irregular').result).toBe('failed');
  });

  it('detecta dados ausentes', () => {
    const result = runAudit({ ...company, email: '', porte: '' }, clean);

    expect(find(result, 'dados_ausentes').result).toBe('failed');
  });

  it('marca como skipped as regras que dependem da BrasilAPI quando ela falha', () => {
    const result = runAudit(company, { official: null, duplicateOf: [] });

    expect(find(result, 'razao_social_divergente').result).toBe('skipped');
    expect(find(result, 'endereco_desatualizado').result).toBe('skipped');
    // Regras locais continuam valendo.
    expect(find(result, 'cnpj_invalido').result).toBe('passed');
    // Skipped não penaliza o score.
    expect(result.score).toBe(100);
  });
});

describe('normalizeName', () => {
  it('remove acento, caixa e espaço extra', () => {
    expect(normalizeName('  Petrobrás   S/A  ')).toBe(normalizeName('PETROBRAS S/A'));
  });
});
