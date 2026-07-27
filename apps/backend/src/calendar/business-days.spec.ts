import { previousBusinessDay } from './business-days';

const dia = (date: Date): string => date.toISOString().slice(0, 10);

describe('previousBusinessDay', () => {
  it('recua um dia quando o anterior é dia útil', () => {
    // Tiradentes de 2026 cai numa terça-feira.
    const holidays = new Set(['2026-04-21']);
    expect(dia(previousBusinessDay(new Date('2026-04-21T00:00:00Z'), holidays))).toBe(
      '2026-04-20',
    );
  });

  it('pula o fim de semana quando o feriado cai na segunda', () => {
    // Finados de 2026 cai numa segunda-feira.
    const holidays = new Set(['2026-11-02']);
    expect(dia(previousBusinessDay(new Date('2026-11-02T00:00:00Z'), holidays))).toBe(
      '2026-10-30',
    );
  });

  it('pula feriados emendados', () => {
    // 24/12 (quinta) marcado como feriado força o recuo até 23/12.
    const holidays = new Set(['2026-12-25', '2026-12-24']);
    expect(dia(previousBusinessDay(new Date('2026-12-25T00:00:00Z'), holidays))).toBe(
      '2026-12-23',
    );
  });

  it('atravessa a virada do ano', () => {
    const holidays = new Set(['2026-01-01']);
    expect(dia(previousBusinessDay(new Date('2026-01-01T00:00:00Z'), holidays))).toBe(
      '2025-12-31',
    );
  });

  it('preserva o horário original da data', () => {
    const result = previousBusinessDay(
      new Date('2026-04-21T12:00:00Z'),
      new Set(['2026-04-21']),
    );
    expect(result.toISOString()).toBe('2026-04-20T12:00:00.000Z');
  });
});
