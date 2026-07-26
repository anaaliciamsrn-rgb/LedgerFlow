import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ActivityModule } from '../activity/activity.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [CommonModule, ActivityModule],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
