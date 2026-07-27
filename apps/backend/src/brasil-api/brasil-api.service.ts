import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HTTP_FETCHER, type Fetcher } from './http-fetcher';
import { mapWithConcurrency } from '../common/concurrency';
import {
  normalizeCnpj,
  toCnpjInfo,
  type BrasilApiCnpjResponse,
  type CnpjInfo,
} from './brasil-api.types';

interface CacheEntry {
  readonly value: CnpjInfo | null;
  readonly expiresAt: number;
}

interface FetchResult {
  readonly definitive: boolean;
  readonly value: CnpjInfo | null;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2;

/**
 * Teto de requisições simultâneas à BrasilAPI (spec §2.1). Sem isso, auditar
 * uma carteira de 50 empresas dispararia 50 chamadas de uma vez e a API
 * aplicaria rate limit no meio da apresentação.
 */
const LOOKUP_CONCURRENCY = 5;

/**
 * Consulta CNPJ na BrasilAPI com resiliência:
 * - cache in-memory (TTL) apenas de respostas definitivas (dado ou 404);
 * - timeout por requisição;
 * - 1 retry em falha transitória, com fallback para null (nunca lança).
 */
@Injectable()
export class BrasilApiService {
  private readonly logger = new Logger(BrasilApiService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(HTTP_FETCHER) private readonly fetcher: Fetcher,
    private readonly config: ConfigService,
  ) {}

  async lookupCnpj(cnpj: string): Promise<CnpjInfo | null> {
    const key = normalizeCnpj(cnpj);

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const result = await this.fetchWithRetry(key);
    if (result.definitive) {
      this.cache.set(key, {
        value: result.value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
    return result.value;
  }

  /**
   * Consulta vários CNPJs com concorrência limitada.
   *
   * Deduplica antes de sair para a rede e reusa o cache de `lookupCnpj`, então
   * CNPJs repetidos na carteira custam uma única chamada. Nunca lança: o CNPJ
   * cuja consulta falhou vira `null` no mapa, e quem chama decide o que fazer
   * (na auditoria, vira uma regra `skipped` em vez de derrubar tudo).
   */
  async lookupMany(
    cnpjs: readonly string[],
  ): Promise<Map<string, CnpjInfo | null>> {
    const keys = [...new Set(cnpjs.map(normalizeCnpj))];

    const values = await mapWithConcurrency(keys, LOOKUP_CONCURRENCY, (key) =>
      this.lookupCnpj(key),
    );

    return new Map(keys.map((key, index) => [key, values[index]]));
  }

  private async fetchWithRetry(cnpj: string): Promise<FetchResult> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return { definitive: true, value: await this.fetchOnce(cnpj) };
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          this.logger.warn(
            `BrasilAPI indisponível para ${cnpj}: ${String(error)}`,
          );
          return { definitive: false, value: null };
        }
      }
    }
    return { definitive: false, value: null };
  }

  private async fetchOnce(cnpj: string): Promise<CnpjInfo | null> {
    const base = this.config.get<string>('BRASILAPI_BASE_URL');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetcher(`${base}/cnpj/v1/${cnpj}`, {
        signal: controller.signal,
      });
      if (response.status === 404) {
        return null; // CNPJ inexistente: resposta definitiva, não é erro
      }
      if (!response.ok) {
        throw new Error(`BrasilAPI status ${response.status}`);
      }
      const raw = (await response.json()) as BrasilApiCnpjResponse;
      return toCnpjInfo(cnpj, raw);
    } finally {
      clearTimeout(timer);
    }
  }
}
