import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
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

  /**
   * O sistema não tem autenticação: em `AUTH_MODE=stub` o escritório vem do
   * header `x-tenant-id`, que qualquer cliente pode escolher. É uma decisão
   * do projeto, não um descuido — mas precisa aparecer no log de quem operar
   * o serviço, e não ficar escondida num arquivo de configuração.
   */
  if (isProduction && config.get<string>('AUTH_MODE') !== 'jwt') {
    Logger.warn(
      'API PÚBLICA E SEM AUTENTICAÇÃO: o escritório é definido pelo header ' +
        'x-tenant-id, então quem souber esta URL consegue ler os dados de ' +
        'qualquer escritório. Restrinja o acesso por outro meio ou ative a ' +
        'autenticação antes de usar com dados reais de clientes.',
      'Bootstrap',
    );
  }

  const port = config.get<number>('PORT') ?? 3333;
  await app.listen(port);

  Logger.log(
    `LedgerFlow backend na porta ${port} (NODE_ENV=${config.get<string>('NODE_ENV')})`,
    'Bootstrap',
  );
}

void bootstrap();
