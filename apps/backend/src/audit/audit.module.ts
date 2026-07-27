import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ActivityModule } from '../activity/activity.module';
import { BrasilApiModule } from '../brasil-api/brasil-api.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [CommonModule, ActivityModule, BrasilApiModule],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
