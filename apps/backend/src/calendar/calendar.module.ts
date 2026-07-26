import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ActivityModule } from '../activity/activity.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  imports: [CommonModule, ActivityModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
