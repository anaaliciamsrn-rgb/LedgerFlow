import { z } from 'zod';
import type { Company as PrismaCompany } from '@prisma/client';

export const companyStatusSchema = z.enum(['active', 'inactive', 'pending']);
export type CompanyStatus = z.infer<typeof companyStatusSchema>;

/** Espelha o createCompanySchema do frontend, com validação de CNPJ. */
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  tradeName: z.string().min(1, 'Nome fantasia é obrigatório'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos (somente números)'),
  status: companyStatusSchema.default('pending'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'UF deve ter 2 letras'),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional().default(''),
});
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;

/** Shape exposto ao frontend (sem campos internos como tenantId/updatedAt). */
export interface CompanyDto {
  readonly id: string;
  readonly name: string;
  readonly tradeName: string;
  readonly cnpj: string;
  readonly status: CompanyStatus;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly state: string;
  readonly healthScore: number;
  readonly createdAt: string;
}

export function toCompanyDto(company: PrismaCompany): CompanyDto {
  return {
    id: company.id,
    name: company.name,
    tradeName: company.tradeName,
    cnpj: company.cnpj,
    status: company.status as CompanyStatus,
    email: company.email,
    phone: company.phone,
    city: company.city,
    state: company.state,
    healthScore: company.healthScore,
    createdAt: company.createdAt.toISOString(),
  };
}
