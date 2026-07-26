import {
  Body,
  Controller,
  Delete,
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
import { CompaniesService } from './companies.service';
import {
  createCompanySchema,
  listCompaniesQuerySchema,
  updateCompanySchema,
  type CompanyDto,
  type CreateCompanyInput,
  type ListCompaniesQuery,
  type UpdateCompanyInput,
} from './company.schema';
import type { Paginated } from '../common/pagination';
import type { CnpjInfo } from '../brasil-api/brasil-api.types';

@Controller('companies')
@UseGuards(TenantContextGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('lookup/:cnpj')
  lookup(@Param('cnpj') cnpj: string): Promise<CnpjInfo | null> {
    return this.companies.lookupCnpj(cnpj);
  }

  @Get()
  list(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(listCompaniesQuerySchema))
    query: ListCompaniesQuery,
  ): Promise<Paginated<CompanyDto>> {
    return this.companies.list(tenantId, query);
  }

  @Get(':id')
  getById(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<CompanyDto> {
    return this.companies.getById(tenantId, id);
  }

  @Post()
  create(
    @CurrentUser() auth: AuthContext,
    @Body(new ZodValidationPipe(createCompanySchema))
    body: CreateCompanyInput,
  ): Promise<CompanyDto> {
    return this.companies.create(auth.tenantId, auth.userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCompanySchema))
    body: UpdateCompanyInput,
  ): Promise<CompanyDto> {
    return this.companies.update(auth.tenantId, auth.userId, id, body);
  }

  @Delete(':id')
  remove(
    @CurrentUser() auth: AuthContext,
    @Param('id') id: string,
  ): Promise<CompanyDto> {
    return this.companies.remove(auth.tenantId, auth.userId, id);
  }
}
