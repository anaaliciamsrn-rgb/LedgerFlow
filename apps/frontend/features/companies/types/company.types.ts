import type { z } from 'zod';
import type { companySchema, companyStatusSchema, createCompanySchema } from '@/features/companies/schemas/company.schema';

export type Company = z.infer<typeof companySchema>;
export type CompanyStatus = z.infer<typeof companyStatusSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;