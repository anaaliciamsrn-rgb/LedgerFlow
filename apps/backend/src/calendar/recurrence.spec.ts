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
});
