import { Module } from '@nestjs/common';
import { BrasilApiService } from './brasil-api.service';
import { HTTP_FETCHER, type Fetcher } from './http-fetcher';

const realFetcher: Fetcher = (url, init) => fetch(url, init);

@Module({
  providers: [
    BrasilApiService,
    { provide: HTTP_FETCHER, useValue: realFetcher },
  ],
  exports: [BrasilApiService],
})
export class BrasilApiModule {}
