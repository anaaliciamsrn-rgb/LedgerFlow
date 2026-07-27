export interface PartnerInfo {
  readonly nome: string;
  readonly qualificacao: string;
  readonly faixaEtaria: string | null;
}

/** Dados normalizados do CNPJ retornados pela BrasilAPI. */
export interface CnpjInfo {
  readonly cnpj: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly situacao: string; // ATIVA | SUSPENSA | INAPTA | BAIXADA | NULA
  readonly cnaeCodigo: string;
  readonly cnaeDescricao: string;
  readonly porte: string;
  readonly naturezaJuridica: string | null;
  readonly dataAbertura: string | null; // ISO date (YYYY-MM-DD)
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cep: string;
  readonly municipio: string;
  readonly uf: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly socios: readonly PartnerInfo[];
}

interface RawPartner {
  readonly nome_socio?: string;
  readonly qualificacao_socio?: string;
  readonly faixa_etaria?: string;
}

/** Resposta crua da BrasilAPI (campos usados). */
export interface BrasilApiCnpjResponse {
  readonly cnpj?: string;
  readonly razao_social?: string;
  readonly nome_fantasia?: string;
  readonly descricao_situacao_cadastral?: string;
  readonly cnae_fiscal?: number | string;
  readonly cnae_fiscal_descricao?: string;
  readonly porte?: string;
  readonly natureza_juridica?: string;
  readonly data_inicio_atividade?: string;
  readonly logradouro?: string;
  readonly numero?: string;
  readonly complemento?: string;
  readonly bairro?: string;
  readonly cep?: string | number;
  readonly municipio?: string;
  readonly uf?: string;
  readonly email?: string;
  readonly ddd_telefone_1?: string;
  readonly qsa?: readonly RawPartner[];
}

export function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

function toPartners(qsa: readonly RawPartner[] | undefined): PartnerInfo[] {
  return (qsa ?? []).map((item) => ({
    nome: item.nome_socio ?? '',
    qualificacao: item.qualificacao_socio ?? '',
    faixaEtaria: item.faixa_etaria ?? null,
  }));
}

export function toCnpjInfo(
  cnpj: string,
  raw: BrasilApiCnpjResponse,
): CnpjInfo {
  return {
    cnpj,
    razaoSocial: raw.razao_social ?? '',
    nomeFantasia: raw.nome_fantasia ?? '',
    situacao: raw.descricao_situacao_cadastral ?? '',
    cnaeCodigo: raw.cnae_fiscal === undefined ? '' : String(raw.cnae_fiscal),
    cnaeDescricao: raw.cnae_fiscal_descricao ?? '',
    porte: raw.porte ?? '',
    naturezaJuridica: raw.natureza_juridica ?? null,
    dataAbertura: raw.data_inicio_atividade ?? null,
    logradouro: raw.logradouro ?? '',
    numero: raw.numero ?? '',
    complemento: raw.complemento ?? null,
    bairro: raw.bairro ?? '',
    cep: raw.cep === undefined ? '' : String(raw.cep).replace(/\D/g, ''),
    municipio: raw.municipio ?? '',
    uf: raw.uf ?? '',
    email: raw.email ?? null,
    telefone: raw.ddd_telefone_1 ?? null,
    socios: toPartners(raw.qsa),
  };
}
