import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { MOCK_PORTFOLIO_COMPANIES, type MockPortfolioCompany } from '@/services/mocks/portfolio.mock';
import type { ApiResponse } from '@/types/api.types';
import type { Bucket, CnaeBucket, Portfolio, PortfolioFilters } from '@/features/portfolio/types/portfolio.types';

const ACTIVE_SITUACAO = 'ATIVA';

// Ordem fixa: essas dimensões têm um domínio conhecido, então aparecem sempre
// no gráfico (mesmo com contagem zero) em vez de sumir quando o filtro esvazia uma delas.
const PORTE_ORDER = ['MEI', 'ME', 'EPP', 'DEMAIS'] as const;
const SITUACAO_ORDER = ['ATIVA', 'SUSPENSA', 'INAPTA', 'BAIXADA'] as const;
const AGE_ORDER = ['Menos de 1 ano', '1 a 5 anos', '5 a 10 anos', 'Mais de 10 anos'] as const;

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

function toQuery(filters: PortfolioFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value.length > 0) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function ageBucketLabel(openedAt: string, now: Date): string {
  const years = (now.getTime() - new Date(openedAt).getTime()) / MS_PER_YEAR;
  if (years < 1) return 'Menos de 1 ano';
  if (years < 5) return '1 a 5 anos';
  if (years < 10) return '5 a 10 anos';
  return 'Mais de 10 anos';
}

function matchesFilters(company: MockPortfolioCompany, filters: PortfolioFilters): boolean {
  if (filters.state && company.state !== filters.state) {
    return false;
  }
  if (filters.porte && company.porte !== filters.porte) {
    return false;
  }
  if (filters.situacao && company.situacao !== filters.situacao) {
    return false;
  }
  const term = filters.search?.trim().toLowerCase() ?? '';
  if (term.length > 0) {
    const digits = term.replace(/\D/g, '');
    const matchesName = company.name.toLowerCase().includes(term);
    const matchesCnpj = digits.length > 0 && company.cnpj.includes(digits);
    if (!matchesName && !matchesCnpj) {
      return false;
    }
  }
  return true;
}

function countBy(companies: readonly MockPortfolioCompany[], keyFn: (company: MockPortfolioCompany) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const company of companies) {
    const key = keyFn(company);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function toSortedBuckets(counts: Map<string, number>): Bucket[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function toFixedOrderBuckets(counts: Map<string, number>, order: readonly string[]): Bucket[] {
  return order.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

function buildMockPortfolio(filters: PortfolioFilters): Portfolio {
  const now = new Date();
  const filtered = MOCK_PORTFOLIO_COMPANIES.filter((company) => matchesFilters(company, filters));

  const byStateCounts = countBy(filtered, (company) => company.state);
  const byPorteCounts = countBy(filtered, (company) => company.porte);
  const bySituacaoCounts = countBy(filtered, (company) => company.situacao);
  const byAgeCounts = countBy(filtered, (company) => ageBucketLabel(company.openedAt, now));

  const cnaeDescriptions = new Map<string, string>();
  for (const company of filtered) {
    cnaeDescriptions.set(company.cnaeCodigo, company.cnaeDescricao);
  }
  const byCnaeCounts = countBy(filtered, (company) => company.cnaeCodigo);
  const byCnae: CnaeBucket[] = [...byCnaeCounts.entries()]
    .map(([codigo, count]) => ({ label: codigo, count, descricao: cnaeDescriptions.get(codigo) ?? codigo }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const irregulares = filtered.filter((company) => company.situacao !== ACTIVE_SITUACAO).length;

  return {
    totals: { companies: filtered.length, irregulares },
    byState: toSortedBuckets(byStateCounts),
    byPorte: toFixedOrderBuckets(byPorteCounts, PORTE_ORDER),
    byCnae,
    bySituacao: toFixedOrderBuckets(bySituacaoCounts, SITUACAO_ORDER),
    byAge: toFixedOrderBuckets(byAgeCounts, AGE_ORDER),
  };
}

export const portfolioService = {
  async get(filters: PortfolioFilters, signal?: AbortSignal): Promise<Portfolio> {
    if (config.useMocks) {
      return buildMockPortfolio(filters);
    }
    const response = await httpClient.get<ApiResponse<Portfolio>>(
      `/dashboard/portfolio${toQuery(filters)}`,
      { signal },
    );
    return response.data;
  },
} as const;
