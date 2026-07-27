export interface Bucket {
  readonly label: string;
  readonly count: number;
}

export interface CnaeBucket extends Bucket {
  readonly descricao: string;
}

export interface Portfolio {
  readonly totals: { readonly companies: number; readonly irregulares: number };
  readonly byState: readonly Bucket[];
  readonly byPorte: readonly Bucket[];
  readonly byCnae: readonly CnaeBucket[];
  readonly bySituacao: readonly Bucket[];
  readonly byAge: readonly Bucket[];
}

export interface PortfolioFilters {
  readonly search?: string;
  readonly state?: string;
  readonly porte?: string;
  readonly situacao?: string;
}
