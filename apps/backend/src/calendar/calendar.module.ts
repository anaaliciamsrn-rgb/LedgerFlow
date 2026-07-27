import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ActivityModule } from '../activity/activity.module';
import { BrasilApiModule } from '../brasil-api/brasil-api.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';

@Module({
  imports: [CommonModule, ActivityModule, BrasilApiModule],
  controllers: [CalendarController, CollaboratorsController],
  providers: [CalendarService, CollaboratorsService],
})
export class CalendarModule {}
