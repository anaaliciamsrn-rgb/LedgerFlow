import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  DashboardService,
  portfolioQuerySchema,
  type HealthScoreDto,
  type OverviewDto,
  type PortfolioDto,
  type PortfolioQuery,
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

  @Get('portfolio')
  portfolio(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(portfolioQuerySchema))
    query: PortfolioQuery,
  ): Promise<PortfolioDto> {
    return this.dashboard.getPortfolio(tenantId, query);
  }
}
