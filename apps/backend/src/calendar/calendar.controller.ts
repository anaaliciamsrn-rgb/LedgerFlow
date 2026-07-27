import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CalendarService } from './calendar.service';
import {
  createObligationSchema,
  holidaysQuerySchema,
  listObligationsQuerySchema,
  updateObligationSchema,
  type CreateObligationInput,
  type HolidayDto,
  type HolidaysQuery,
  type ListObligationsQuery,
  type ObligationDto,
  type OverdueDto,
  type UpdateObligationInput,
} from './calendar.schema';

@Controller('calendar')
@UseGuards(TenantContextGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('holidays')
  listHolidays(
    @Query(new ZodValidationPipe(holidaysQuerySchema)) query: HolidaysQuery,
  ): Promise<HolidayDto[]> {
    return this.calendar.listHolidays(query.year);
  }

  /** Rota literal antes de qualquer rota com parâmetro, para não colidir. */
  @Get('obligations/overdue')
  listOverdue(@TenantId() tenantId: string): Promise<OverdueDto> {
    return this.calendar.listOverdue(tenantId);
  }

  @Get('obligations')
  list(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(listObligationsQuerySchema))
    query: ListObligationsQuery,
  ): Promise<ObligationDto[]> {
    return this.calendar.list(tenantId, query);
  }

  @Post('obligations')
  create(
    @CurrentUser() auth: AuthContext,
    @Body(new ZodValidationPipe(createObligationSchema))
    body: CreateObligationInput,
  ): Promise<ObligationDto[]> {
    return this.calendar.create(auth.tenantId, auth.userId, body);
  }

  @Patch('obligations/:id')
  update(
    @CurrentUser() auth: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateObligationSchema))
    body: UpdateObligationInput,
  ): Promise<ObligationDto> {
    return this.calendar.update(auth.tenantId, auth.userId, id, body);
  }
}
