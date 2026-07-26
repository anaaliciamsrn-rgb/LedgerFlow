import { companyListSchema } from '@/features/companies/schemas/company.schema';
import type { Company } from '@/features/companies/types/company.types';

const rawCompanies = [
  { id: 'cmp_001', name: 'Tech Solutions LTDA', tradeName: 'TechSol', cnpj: '12345678000190', status: 'active', email: 'contato@techsol.com.br', phone: '11987654321', city: 'São Paulo', state: 'SP', healthScore: 92, createdAt: '2025-03-12T10:00:00.000Z' },
  { id: 'cmp_002', name: 'Comércio Silva ME', tradeName: 'Silva Comércio', cnpj: '98765432000110', status: 'active', email: 'financeiro@silvame.com.br', phone: '2133445566', city: 'Rio de Janeiro', state: 'RJ', healthScore: 74, createdAt: '2025-05-20T14:30:00.000Z' },
  { id: 'cmp_003', name: 'Indústria Verde SA', tradeName: 'Verde', cnpj: '45678912000133', status: 'pending', email: 'contato@verde.ind.br', phone: '3199887766', city: 'Belo Horizonte', state: 'MG', healthScore: 58, createdAt: '2025-06-01T09:15:00.000Z' },
  { id: 'cmp_004', name: 'Consultoria Alfa LTDA', tradeName: 'Alfa', cnpj: '32165498000177', status: 'inactive', email: 'adm@alfaconsult.com.br', phone: '4133221100', city: 'Curitiba', state: 'PR', healthScore: 31, createdAt: '2024-11-08T16:45:00.000Z' },
  { id: 'cmp_005', name: 'Distribuidora Norte SA', tradeName: 'DistriNorte', cnpj: '78912345000144', status: 'active', email: 'vendas@distrinorte.com.br', phone: '9298765432', city: 'Manaus', state: 'AM', healthScore: 87, createdAt: '2025-01-25T11:20:00.000Z' },
];

export const MOCK_COMPANIES: readonly Company[] = companyListSchema.parse(rawCompanies);