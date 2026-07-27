import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HolidaysService } from './holidays.service';
import { HTTP_FETCHER } from './http-fetcher';

describe('HolidaysService', () => {
  let service: HolidaysService;
  let calls: number;
  let shouldFail: boolean;

  beforeEach(async () => {
    calls = 0;
    shouldFail = false;

    const fetcher = async () => {
      calls++;
      if (shouldFail) {
        throw new Error('rede indisponível');
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          { date: '2026-01-01', name: 'Confraternização mundial' },
          { date: '2026-04-21', name: 'Tiradentes' },
        ],
      };
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [HolidaysService, { provide: HTTP_FETCHER, useValue: fetcher }],
    }).compile();

    service = moduleRef.get(HolidaysService);
  });

  it('indexa os feriados por data ISO', async () => {
    const holidays = await service.listByYear(2026);

    expect(holidays.get('2026-01-01')).toBe('Confraternização mundial');
    expect(holidays.get('2026-04-21')).toBe('Tiradentes');
    expect(holidays.has('2026-03-15')).toBe(false);
  });

  it('busca uma vez por ano e reusa o cache', async () => {
    await service.listByYear(2026);
    await service.listByYear(2026);

    expect(calls).toBe(1);
  });

  it('devolve mapa vazio quando a BrasilAPI falha, sem lançar', async () => {
    shouldFail = true;

    const holidays = await service.listByYear(2026);

    expect(holidays.size).toBe(0);
  });
});
