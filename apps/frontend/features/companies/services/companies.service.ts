import { config } from '@/services/config';
import { httpClient } from '@/lib/http-client';
import { MOCK_COMPANIES } from '@/services/mocks/companies.mock';
import type { Company, CreateCompanyInput } from '@/features/companies/types/company.types';
import type { PaginatedResponse, ApiResponse } from '@/types/api.types';
import type { QueryParams } from '@/types/common.types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

function paginate(items: readonly Company[], params?: QueryParams): PaginatedResponse<Company> {
  const page = params?.page ?? DEFAULT_PAGE;
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = params?.search?.trim().toLowerCase() ?? '';

  const filtered = search.length > 0
    ? items.filter((company) => company.name.toLowerCase().includes(search) || company.tradeName.toLowerCase().includes(search) || company.cnpj.includes(search))
    : items;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, pagination: { page, pageSize, total, totalPages } };
}

function buildQueryString(params?: QueryParams): string {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  if (params.page) {
    search.set('page', String(params.page));
  }
  if (params.pageSize) {
    search.set('pageSize', String(params.pageSize));
  }
  if (params.search) {
    search.set('search', params.search);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const companiesService = {
  async list(params?: QueryParams, signal?: AbortSignal): Promise<PaginatedResponse<Company>> {
    if (config.useMocks) {
      return paginate(MOCK_COMPANIES, params);
    }
    return httpClient.get<PaginatedResponse<Company>>(`/companies${buildQueryString(params)}`, { signal });
  },

  async getById(companyId: string, signal?: AbortSignal): Promise<Company> {
    if (config.useMocks) {
      const company = MOCK_COMPANIES.find((item) => item.id === companyId);
      if (!company) {
        throw new Error(`Empresa não encontrada: ${companyId}`);
      }
      return company;
    }
    const response = await httpClient.get<ApiResponse<Company>>(`/companies/${companyId}`, { signal });
    return response.data;
  },

  async create(input: CreateCompanyInput): Promise<Company> {
    if (config.useMocks) {
      return { ...input, id: `cmp_${Date.now()}`, healthScore: 100, createdAt: new Date().toISOString() };
    }
    const response = await httpClient.post<ApiResponse<Company>>('/companies', input);
    return response.data;
  },
} as const;