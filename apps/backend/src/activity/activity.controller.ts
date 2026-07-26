import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ActivityService } from './activity.service';
import {
  listActivityQuerySchema,
  type ActivityLogDto,
  type ListActivityQuery,
} from './activity.types';
import type { Paginated } from '../common/pagination';

@Controller('activity')
@UseGuards(TenantContextGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  list(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(listActivityQuerySchema))
    query: ListActivityQuery,
  ): Promise<Paginated<ActivityLogDto>> {
    return this.activity.list(tenantId, query);
  }
}
