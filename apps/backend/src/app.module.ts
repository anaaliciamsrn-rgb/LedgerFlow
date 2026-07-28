import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { validateEnv } from './config/env.validation';
import { SESSION_SECONDS } from './auth/auth.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CalendarModule } from './calendar/calendar.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    /**
     * Global porque o `TenantContextGuard` precisa validar o token em todo
     * módulo protegido; registrar por módulo espalharia a mesma configuração
     * e abriria espaço para divergirem.
     */
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: SESSION_SECONDS },
      }),
    }),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    CompaniesModule,
    AuditModule,
    DashboardModule,
    CalendarModule,
    ActivityModule,
  ],
})
export class AppModule {}
