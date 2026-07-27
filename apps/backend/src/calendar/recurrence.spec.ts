import { generateOccurrences } from './recurrence';

describe('generateOccurrences', () => {
  it('devolve uma única data quando não há recorrência', () => {
    const result = generateOccurrences(new Date('2026-03-05T00:00:00Z'), 'none', 12);
    expect(result).toHaveLength(1);
  });

  it('gera N ocorrências mensais mantendo o dia', () => {
    const result = generateOccurrences(new Date('2026-01-05T00:00:00Z'), 'monthly', 3);

    expect(result).toHaveLength(3);
    expect(result[0].toISOString().slice(0, 10)).toBe('2026-01-05');
    expect(result[1].toISOString().slice(0, 10)).toBe('2026-02-05');
    expect(result[2].toISOString().slice(0, 10)).toBe('2026-03-05');
  });

  it('ajusta para o último dia do mês quando o dia não existe', () => {
    const result = generateOccurrences(new Date('2026-01-31T00:00:00Z'), 'monthly', 2);

    // Fevereiro de 2026 tem 28 dias — não pode vazar para 3 de março.
    expect(result[1].toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('nunca gera menos de uma ocorrência', () => {
    expect(generateOccurrences(new Date('2026-01-05T00:00:00Z'), 'monthly', 0)).toHaveLength(1);
  });

  it('gera ocorrências semanais somando 7 dias', () => {
    const result = generateOccurrences(new Date('2026-01-05T00:00:00Z'), 'weekly', 3);

    expect(result.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
    ]);
  });

  it('gera ocorrências quinzenais atravessando a virada do mês', () => {
    const result = generateOccurrences(new Date('2026-01-22T00:00:00Z'), 'biweekly', 3);

    expect(result.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-22',
      '2026-02-05',
      '2026-02-19',
    ]);
  });

  it('gera ocorrências trimestrais respeitando o último dia do mês', () => {
    const result = generateOccurrences(new Date('2026-01-31T00:00:00Z'), 'quarterly', 3);

    // Abril tem 30 dias — a data não pode vazar para 1º de maio.
    expect(result.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-31',
      '2026-04-30',
      '2026-07-31',
    ]);
  });

  it('gera ocorrências anuais convertendo 29/02 em ano comum', () => {
    const result = generateOccurrences(new Date('2028-02-29T00:00:00Z'), 'yearly', 2);

    expect(result.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2028-02-29',
      '2029-02-28',
    ]);
  });

  it('limita o total a 24 ocorrências', () => {
    expect(generateOccurrences(new Date('2026-01-05T00:00:00Z'), 'weekly', 99)).toHaveLength(24);
  });
});
