/** Dados normalizados do CNPJ retornados pela BrasilAPI. */
export interface CnpjInfo {
  readonly cnpj: string;
  readonly razaoSocial: string;
  readonly nomeFantasia: string;
  readonly municipio: string;
  readonly uf: string;
  readonly situacao: string; // ex.: ATIVA, SUSPENSA, INAPTA, BAIXADA
  readonly email: string | null;
  readonly telefone: string | null;
}

/** Resposta crua da BrasilAPI (campos usados). */
export interface BrasilApiCnpjResponse {
  readonly cnpj?: string;
  readonly razao_social?: string;
  readonly nome_fantasia?: string;
  readonly municipio?: string;
  readonly uf?: string;
  readonly descricao_situacao_cadastral?: string;
  readonly email?: string;
  readonly ddd_telefone_1?: string;
}

export function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function toCnpjInfo(
  cnpj: string,
  raw: BrasilApiCnpjResponse,
): CnpjInfo {
  return {
    cnpj,
    razaoSocial: raw.razao_social ?? '',
    nomeFantasia: raw.nome_fantasia ?? '',
    municipio: raw.municipio ?? '',
    uf: raw.uf ?? '',
    situacao: raw.descricao_situacao_cadastral ?? '',
    email: raw.email ?? null,
    telefone: raw.ddd_telefone_1 ?? null,
  };
}
