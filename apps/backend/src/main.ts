import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { corsOrigins } from './config/env.validation';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/** Teto do corpo da requisição: nenhum endpoint da API recebe payload grande. */
const BODY_LIMIT = '256kb';

async function bootstrap(): Promise<void> {
  // `bodyParser: false` para registrar o parser com limite explícito — o
  // padrão do Nest aceita 100kb sem dizer, e o limite fica invisível.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));
  // O token de sessão vive num cookie httpOnly; sem este parser o guard não
  // enxerga `req.cookies` e toda requisição autenticada viraria 401.
  app.use(cookieParser());

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  /**
   * Em desenvolvimento o CORS reflete a origem que chamou, para não atrapalhar
   * `localhost` em portas variadas. Em produção só a lista explícita passa —
   * `origin: true` com `credentials` deixaria qualquer site conversar com a
   * API usando as credenciais de quem estivesse logado. `validateEnv` já
   * garante que a lista não está vazia em produção.
   */
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const origins = corsOrigins(config.get<string>('CORS_ORIGINS'));

  app.enableCors({
    origin: isProduction ? origins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Encerramento limpo: em PaaS (Render/Railway/Fly) o processo recebe SIGTERM
  // no deploy, e sem isso as conexões do Prisma ficariam penduradas.
  app.enableShutdownHooks();

  const port = config.get<number>('PORT') ?? 3333;
  await app.listen(port);

  Logger.log(
    `LedgerFlow backend na porta ${port} (NODE_ENV=${config.get<string>('NODE_ENV')})`,
    'Bootstrap',
  );
}

void bootstrap();
