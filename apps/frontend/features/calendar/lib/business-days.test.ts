import { describe, it, expect } from 'vitest';
import { previousBusinessDay } from './business-days';

const dia = (date: Date): string => date.toISOString().slice(0, 10);

describe('previousBusinessDay', () => {
  it('recua um dia quando o anterior é dia útil', () => {
    expect(
      dia(previousBusinessDay(new Date('2026-04-21T00:00:00Z'), new Set(['2026-04-21']))),
    ).toBe('2026-04-20');
  });

  it('pula o fim de semana quando o feriado cai na segunda', () => {
    expect(
      dia(previousBusinessDay(new Date('2026-11-02T00:00:00Z'), new Set(['2026-11-02']))),
    ).toBe('2026-10-30');
  });

  it('pula feriados emendados', () => {
    const holidays = new Set(['2026-12-25', '2026-12-24']);
    expect(dia(previousBusinessDay(new Date('2026-12-25T00:00:00Z'), holidays))).toBe(
      '2026-12-23',
    );
  });

  it('atravessa a virada do ano', () => {
    expect(
      dia(previousBusinessDay(new Date('2026-01-01T00:00:00Z'), new Set(['2026-01-01']))),
    ).toBe('2025-12-31');
  });
});
