import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HTTP_FETCHER, type Fetcher } from './http-fetcher';

interface RawHoliday {
  readonly date?: string;
  readonly name?: string;
}

const TIMEOUT_MS = 5000;

/**
 * Feriados nacionais por ano (BrasilAPI /feriados/v1/{ano}).
 * Cache permanente em memória — a lista de um ano não muda.
 * Falha de rede devolve mapa vazio: o calendário funciona sem os alertas.
 */
@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);
  private readonly cache = new Map<number, Map<string, string>>();

  constructor(
    @Inject(HTTP_FETCHER) private readonly fetcher: Fetcher,
    private readonly config: ConfigService,
  ) {}

  async listByYear(year: number): Promise<Map<string, string>> {
    const cached = this.cache.get(year);
    if (cached) {
      return cached;
    }

    const holidays = await this.fetchYear(year);
    if (holidays.size > 0) {
      this.cache.set(year, holidays);
    }
    return holidays;
  }

  private async fetchYear(year: number): Promise<Map<string, string>> {
    const base = this.config.get<string>('BRASILAPI_BASE_URL');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await this.fetcher(`${base}/feriados/v1/${year}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`BrasilAPI status ${response.status}`);
      }
      const raw = (await response.json()) as readonly RawHoliday[];
      return new Map(
        raw
          .filter((item): item is Required<RawHoliday> =>
            Boolean(item.date && item.name),
          )
          .map((item) => [item.date, item.name]),
      );
    } catch (error) {
      this.logger.warn(`Feriados de ${year} indisponíveis: ${String(error)}`);
      return new Map();
    } finally {
      clearTimeout(timer);
    }
  }
}
