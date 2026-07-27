export interface MockPortfolioCompany {
  readonly id: string;
  readonly name: string;
  readonly cnpj: string;
  readonly state: string;
  readonly porte: string;
  readonly cnaeCodigo: string;
  readonly cnaeDescricao: string;
  readonly situacao: string;
  readonly openedAt: string;
}

const STATES = ['SP', 'RJ', 'MG', 'PR', 'SC'] as const;

const PORTES = ['MEI', 'ME', 'EPP', 'DEMAIS'] as const;

const CNAES = [
  { codigo: '6201-5/01', descricao: 'Desenvolvimento de programas de computador sob encomenda' },
  { codigo: '4712-1/00', descricao: 'Comércio varejista de mercadorias em geral' },
  { codigo: '5611-2/01', descricao: 'Restaurantes e similares' },
  { codigo: '6920-6/01', descricao: 'Atividades de contabilidade, consultoria e auditoria' },
  { codigo: '4120-4/00', descricao: 'Construção de edifícios' },
] as const;

// Ponderado para que a maioria das empresas esteja ATIVA, como numa carteira real.
const SITUACOES = ['ATIVA', 'ATIVA', 'ATIVA', 'SUSPENSA', 'INAPTA', 'BAIXADA'] as const;

// Datas cobrindo as 4 faixas de idade calculadas pelo serviço: <1, 1-5, 5-10, 10+ anos.
const OPENED_DATES = [
  '2026-02-14',
  '2025-09-03',
  '2023-05-20',
  '2022-11-08',
  '2021-08-15',
  '2019-03-10',
  '2017-06-22',
  '2012-01-30',
  '2005-09-17',
] as const;

const NAME_STEMS = [
  'Alfa Comércio',
  'Vértice Tecnologia',
  'Planalto Serviços',
  'Litoral Alimentos',
  'Serra Azul Contabilidade',
  'Vale Verde Construções',
  'Nordeste Digital',
  'Sul Log Transportes',
  'Rio Norte Comércio',
  'Minas Tech Sistemas',
  'Costa Sul Restaurantes',
  'Capital Consultoria',
  'Aurora Materiais',
  'Bela Vista Alimentação',
  'Progresso Engenharia',
  'União Softwares',
  'Metrópole Distribuidora',
  'Fortaleza Norte Comércio',
  'Horizonte Contábil',
  'Pampa Tecnologia',
] as const;

const SUFFIXES = ['LTDA', 'ME', 'EIRELI', 'S.A.'] as const;

const COMPANIES_PER_STATE = 9;

function buildCnpj(sequence: number): string {
  const base = String(sequence).padStart(8, '0');
  return `${base}000${100 + (sequence % 90)}`;
}

function buildMockCompanies(): readonly MockPortfolioCompany[] {
  const companies: MockPortfolioCompany[] = [];
  let counter = 0;

  for (const state of STATES) {
    for (let i = 0; i < COMPANIES_PER_STATE; i += 1) {
      const stem = NAME_STEMS[counter % NAME_STEMS.length]!;
      const suffix = SUFFIXES[counter % SUFFIXES.length]!;
      const porte = PORTES[counter % PORTES.length]!;
      const cnae = CNAES[counter % CNAES.length]!;
      const situacao = SITUACOES[counter % SITUACOES.length]!;
      const openedAt = OPENED_DATES[counter % OPENED_DATES.length]!;

      companies.push({
        id: `port_${String(counter + 1).padStart(3, '0')}`,
        name: `${stem} ${suffix}`,
        cnpj: buildCnpj(counter + 1),
        state,
        porte,
        cnaeCodigo: cnae.codigo,
        cnaeDescricao: cnae.descricao,
        situacao,
        openedAt,
      });

      counter += 1;
    }
  }

  return companies;
}

export const MOCK_PORTFOLIO_COMPANIES: readonly MockPortfolioCompany[] = buildMockCompanies();
