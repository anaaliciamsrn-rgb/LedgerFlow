import { z } from 'zod';

export const companySizeSchema = z.enum(['MEI', 'ME', 'EPP', 'DEMAIS']);

export const registrationStatusSchema = z.enum([
  'ATIVA',
  'BAIXADA',
  'INAPTA',
  'SUSPENSA',
  'NULA',
]);

export const partnerSchema = z.object({
  name: z.string(),
  role: z.string(),
  since: z.string(),
});

export const cnpjLookupSchema = z.object({
  cnpj: z.string(),
  legalName: z.string(),
  tradeName: z.string(),
  registrationStatus: registrationStatusSchema,
  openingDate: z.string(),
  size: companySizeSchema,
  mainActivity: z.object({
    code: z.string(),
    description: z.string(),
  }),
  address: z.object({
    street: z.string(),
    number: z.string(),
    district: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }),
  email: z.string(),
  phone: z.string(),
  partners: z.array(partnerSchema),
});

export type CnpjLookupResult = z.infer<typeof cnpjLookupSchema>;
export type CompanySize = z.infer<typeof companySizeSchema>;
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type Partner = z.infer<typeof partnerSchema>;
