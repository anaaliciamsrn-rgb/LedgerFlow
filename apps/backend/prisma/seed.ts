import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'tnt_dev';

const RESPONSAVEIS = ['Ana Souza', 'Bruno Lima', 'Carla Dias'] as const;

const COMPANIES = [
  {
    // CNPJ real e válido, tudo em ordem — a empresa "saudável" da demo.
    name: 'PETROLEO BRASILEIRO S A PETROBRAS',
    tradeName: 'PETROBRAS',
    cnpj: '33000167000101',
    status: 'active',
    situacaoCadastral: 'ATIVA',
    cnaeCodigo: '1921700',
    cnaeDescricao: 'Fabricação de produtos do refino de petróleo',
    porte: 'DEMAIS',
    naturezaJuridica: 'Sociedade Anônima Aberta',
    dataAbertura: new Date('1953-10-03'),
    email: 'contato@petrobras.com.br',
    phone: '2132242000',
    logradouro: 'REPUBLICA DO CHILE',
    numero: '65',
    bairro: 'CENTRO',
    cep: '20031912',
    city: 'Rio de Janeiro',
    state: 'RJ',
    healthScore: 100,
  },
  {
    name: 'MAGAZINE LUIZA S/A',
    tradeName: 'MAGALU',
    cnpj: '47960950000121',
    status: 'active',
    situacaoCadastral: 'ATIVA',
    cnaeCodigo: '4753900',
    cnaeDescricao: 'Comércio varejista especializado de eletrodomésticos',
    porte: 'DEMAIS',
    naturezaJuridica: 'Sociedade Anônima Aberta',
    dataAbertura: new Date('1992-11-25'),
    email: 'ri@magazineluiza.com.br',
    phone: '1633046800',
    logradouro: 'VOLUNTARIOS DA FRANCA',
    numero: '1465',
    bairro: 'CENTRO',
    cep: '14400490',
    city: 'Franca',
    state: 'SP',
    healthScore: 100,
  },
  {
    // CNPJ com dígito verificador errado — dispara `cnpj_invalido`.
    name: 'Padaria Pão Quente LTDA',
    tradeName: 'Pão Quente',
    cnpj: '12345678000190',
    status: 'active',
    situacaoCadastral: 'ATIVA',
    cnaeCodigo: '4721102',
    cnaeDescricao: 'Padaria e confeitaria com predominância de revenda',
    porte: 'ME',
    naturezaJuridica: 'Sociedade Empresária Limitada',
    dataAbertura: new Date('2019-03-12'),
    email: 'contato@paoquente.com.br',
    phone: '1133334444',
    logradouro: 'RUA DAS FLORES',
    numero: '120',
    bairro: 'CENTRO',
    cep: '01001000',
    city: 'São Paulo',
    state: 'SP',
    healthScore: 60,
  },
  {
    // Situação BAIXADA e sem e-mail — dispara `situacao_irregular` e `dados_ausentes`.
    name: 'Transportes Rápido EIRELI',
    tradeName: 'Rápido Log',
    cnpj: '71673990000177',
    status: 'inactive',
    situacaoCadastral: 'BAIXADA',
    cnaeCodigo: '4930202',
    cnaeDescricao: 'Transporte rodoviário de carga',
    porte: 'EPP',
    naturezaJuridica: 'Empresa Individual de Responsabilidade Limitada',
    dataAbertura: new Date('2014-07-01'),
    email: '',
    phone: '',
    logradouro: 'AVENIDA BRASIL',
    numero: '9000',
    bairro: 'DISTRITO INDUSTRIAL',
    cep: '14090000',
    city: 'Ribeirão Preto',
    state: 'SP',
    healthScore: 30,
  },
  {
    // Mesma razão social da anterior, CNPJ diferente — dispara `empresa_duplicada`.
    name: 'Transportes Rápido EIRELI',
    tradeName: 'Rápido Log Filial',
    cnpj: '07526557000100',
    status: 'pending',
    situacaoCadastral: 'ATIVA',
    cnaeCodigo: '4930202',
    cnaeDescricao: 'Transporte rodoviário de carga',
    porte: 'ME',
    naturezaJuridica: 'Empresa Individual de Responsabilidade Limitada',
    dataAbertura: new Date('2023-02-20'),
    email: 'filial@rapidolog.com.br',
    phone: '1955556666',
    logradouro: 'AVENIDA BRASIL',
    numero: '9010',
    bairro: 'DISTRITO INDUSTRIAL',
    cep: '14090000',
    city: 'Ribeirão Preto',
    state: 'SP',
    healthScore: 70,
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

  const companies = await prisma.company.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { createdAt: 'asc' },
  });

  await prisma.obligation.deleteMany({ where: { tenantId: TENANT_ID } });

  const hoje = new Date();
  const mes = (offset: number, dia: number): Date =>
    new Date(hoje.getFullYear(), hoje.getMonth() + offset, dia);

  // Duas tarefas recorrentes (3 ocorrências cada) + duas avulsas.
  // A ocorrência de 1º de janeiro cai em feriado nacional de propósito.
  const grupoFolha = 'rec_folha';
  const grupoGuias = 'rec_guias';

  await prisma.obligation.createMany({
    data: [
      ...[0, 1, 2].map((offset) => ({
        tenantId: TENANT_ID,
        companyId: companies[0]?.id ?? null,
        title: 'Fechamento da folha de pagamento',
        type: 'FOLHA',
        dueDate: mes(offset, 5),
        status: offset === 0 ? 'completed' : 'pending',
        assignee: RESPONSAVEIS[0],
        recurrenceGroupId: grupoFolha,
      })),
      ...[0, 1, 2].map((offset) => ({
        tenantId: TENANT_ID,
        companyId: companies[1]?.id ?? null,
        title: 'Emissão de guias DAS',
        type: 'DAS',
        dueDate: mes(offset, 20),
        status: 'pending',
        assignee: RESPONSAVEIS[1],
        recurrenceGroupId: grupoGuias,
      })),
      {
        tenantId: TENANT_ID,
        companyId: companies[2]?.id ?? null,
        title: 'Envio de documentos ao cliente',
        type: 'DOCUMENTOS',
        dueDate: mes(-1, 10), // vencida — demonstra o selo de atraso
        status: 'pending',
        assignee: RESPONSAVEIS[2],
      },
      {
        tenantId: TENANT_ID,
        companyId: companies[3]?.id ?? null,
        title: 'Conferência mensal',
        type: 'CONFERENCIA',
        dueDate: new Date(hoje.getFullYear() + 1, 0, 1), // 1º de janeiro = feriado
        status: 'pending',
        assignee: RESPONSAVEIS[0],
      },
    ],
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
