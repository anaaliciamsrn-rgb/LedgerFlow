import { z } from 'zod';

export const companyStatusSchema = z.enum(['active', 'inactive', 'pending']);

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  tradeName: z.string(),
  cnpj: z.string(),
  status: companyStatusSchema,
  email: z.string().email(),
  phone: z.string(),
  city: z.string(),
  state: z.string(),
  healthScore: z.number().min(0).max(100),
  createdAt: z.string(),
});

export const createCompanySchema = companySchema.omit({
  id: true,
  healthScore: true,
  createdAt: true,
});

export const companyListSchema = z.array(companySchema);