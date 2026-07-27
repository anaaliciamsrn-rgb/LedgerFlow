import { cnpjLookupSchema, type CnpjLookupResult } from '@/features/companies/schemas/cnpj-lookup.schema';

const KNOWN: Record<string, unknown> = {
  '11222333000181': {
    cnpj: '11222333000181',
    legalName: 'Tech Solutions Desenvolvimento de Software LTDA',
    tradeName: 'TechSol',
    registrationStatus: 'ATIVA',
    openingDate: '2018-03-12',
    size: 'EPP',
    mainActivity: { code: '62.01-5-01', description: 'Desenvolvimento de programas de computador sob encomenda' },
    address: { street: 'Avenida Paulista', number: '1578', district: 'Bela Vista', city: 'São Paulo', state: 'SP', zipCode: '01310200' },
    email: 'contato@techsol.com.br',
    phone: '1132659874',
    partners: [
      { name: 'Mariana Costa Ribeiro', role: 'Sócia-Administradora', since: '2018-03-12' },
      { name: 'Rafael Almeida Souza', role: 'Sócio', since: '2019-07-01' },
    ],
  },
  '45678912000133': {
    cnpj: '45678912000133',
    legalName: 'Indústria Verde de Alimentos SA',
    tradeName: 'Verde Alimentos',
    registrationStatus: 'SUSPENSA',
    openingDate: '2010-09-20',
    size: 'DEMAIS',
    mainActivity: { code: '10.94-5-00', description: 'Fabricação de massas alimentícias' },
    address: { street: 'Rodovia BR-040', number: 'KM 12', district: 'Distrito Industrial', city: 'Belo Horizonte', state: 'MG', zipCode: '31840000' },
    email: 'contato@verde.ind.br',
    phone: '3139887766',
    partners: [
      { name: 'Carlos Eduardo Menezes', role: 'Diretor Presidente', since: '2010-09-20' },
    ],
  },
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function buildGeneric(cnpj: string): CnpjLookupResult {
  return cnpjLookupSchema.parse({
    cnpj,
    legalName: `Empresa ${cnpj.slice(0, 8)} LTDA`,
    tradeName: `Empresa ${cnpj.slice(0, 4)}`,
    registrationStatus: 'ATIVA',
    openingDate: '2020-01-15',
    size: 'ME',
    mainActivity: { code: '47.51-2-01', description: 'Comércio varejista especializado' },
    address: { street: 'Rua Comercial', number: '100', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01001000' },
    email: 'contato@empresa.com.br',
    phone: '1130000000',
    partners: [{ name: 'Sócio Responsável', role: 'Sócio-Administrador', since: '2020-01-15' }],
  });
}

export function getCnpjLookupMock(cnpj: string): CnpjLookupResult {
  const digits = onlyDigits(cnpj);
  const known = KNOWN[digits];
  if (known) {
    return cnpjLookupSchema.parse(known);
  }
  return buildGeneric(digits);
}
