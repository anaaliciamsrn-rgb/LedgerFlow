import { Module } from '@nestjs/common';
import { BrasilApiService } from './brasil-api.service';
import { HolidaysService } from './holidays.service';
import { HTTP_FETCHER, type Fetcher } from './http-fetcher';

/**
 * A BrasilAPI responde 403 a requisições sem `User-Agent`, e o `fetch` do Node
 * não envia um por padrão — ao contrário do curl e do navegador. Sem este
 * cabeçalho a integração inteira degrada em silêncio: o onboarding não
 * preenche nada e duas regras da auditoria ficam permanentemente `skipped`.
 *
 * O bug não aparece em teste algum, porque todos injetam um fetcher falso.
 * Só foi descoberto exercitando a API real.
 */
const USER_AGENT = 'LedgerFlow/1.0 (+contabilidade)';

const realFetcher: Fetcher = (url, init) =>
  fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT } });

@Module({
  providers: [
    BrasilApiService,
    HolidaysService,
    { provide: HTTP_FETCHER, useValue: realFetcher },
  ],
  exports: [BrasilApiService, HolidaysService],
})
export class BrasilApiModule {}
