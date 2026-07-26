import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: true, credentials: true });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3333;

  await app.listen(port);
  Logger.log(`LedgerFlow backend em http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
