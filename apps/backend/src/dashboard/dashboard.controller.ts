import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import {
  DashboardService,
  type HealthScoreDto,
  type OverviewDto,
} from './dashboard.service';

@Controller('dashboard')
@UseGuards(TenantContextGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  overview(@TenantId() tenantId: string): Promise<OverviewDto> {
    return this.dashboard.getOverview(tenantId);
  }

  @Get('health-score')
  healthScore(@TenantId() tenantId: string): Promise<HealthScoreDto> {
    return this.dashboard.getHealthScore(tenantId);
  }
}
