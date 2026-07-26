import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'tnt_dev';

const COMPANIES = [
  {
    name: 'Padaria Pão Quente LTDA',
    tradeName: 'Pão Quente',
    cnpj: '12345678000190',
    status: 'active',
    email: 'contato@paoquente.com.br',
    phone: '1133334444',
    city: 'São Paulo',
    state: 'SP',
    healthScore: 92,
  },
  {
    name: 'Tech Solutions Consultoria ME',
    tradeName: 'Tech Solutions',
    cnpj: '98765432000110',
    status: 'active',
    email: 'financeiro@techsolutions.com.br',
    phone: '1144445555',
    city: 'Campinas',
    state: 'SP',
    healthScore: 78,
  },
  {
    name: 'Transportes Rápido EIRELI',
    tradeName: 'Rápido Log',
    cnpj: '45678912000133',
    status: 'pending',
    email: 'contato@rapidolog.com.br',
    phone: '1955556666',
    city: 'Ribeirão Preto',
    state: 'SP',
    healthScore: 55,
  },
];

async function main(): Promise<void> {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'Contabilidade Modelo',
      slug: 'contabilidade-modelo',
    },
  });

  for (const company of COMPANIES) {
    await prisma.company.upsert({
      where: {
        tenantId_cnpj: { tenantId: TENANT_ID, cnpj: company.cnpj },
      },
      update: {},
      create: { ...company, tenantId: TENANT_ID },
    });
  }

  const count = await prisma.company.count({
    where: { tenantId: TENANT_ID },
  });
  console.log(`Seed concluído: tenant ${TENANT_ID} com ${count} empresas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
