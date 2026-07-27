import { Module } from '@nestjs/common';
import { BrasilApiService } from './brasil-api.service';
import { HolidaysService } from './holidays.service';
import { HTTP_FETCHER, type Fetcher } from './http-fetcher';

const realFetcher: Fetcher = (url, init) => fetch(url, init);

@Module({
  providers: [
    BrasilApiService,
    HolidaysService,
    { provide: HTTP_FETCHER, useValue: realFetcher },
  ],
  exports: [BrasilApiService, HolidaysService],
})
export class BrasilApiModule {}
