import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Company as PrismaCompany } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { paginated, type Paginated } from '../common/pagination';
import {
  toCompanyDto,
  type CompanyDto,
  type CreateCompanyInput,
  type ListCompaniesQuery,
  type UpdateCompanyInput,
} from './company.schema';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(
    tenantId: string,
    query: ListCompaniesQuery,
  ): Promise<Paginated<CompanyDto>> {
    const { page, pageSize, search } = query;

    const where: Prisma.CompanyWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { tradeName: { contains: search } },
        { cnpj: { contains: search } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return paginated(rows.map(toCompanyDto), page, pageSize, total);
  }

  async getById(tenantId: string, id: string): Promise<CompanyDto> {
    return toCompanyDto(await this.ensureOwned(tenantId, id));
  }

  async create(
    tenantId: string,
    actorId: string,
    input: CreateCompanyInput,
  ): Promise<CompanyDto> {
    try {
      const company = await this.prisma.company.create({
        data: { ...input, tenantId },
      });
      await this.activity.record({
        tenantId,
        actorId,
        action: 'company.created',
        entityType: 'company',
        entityId: company.id,
      });
      return toCompanyDto(company);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyDto> {
    await this.ensureOwned(tenantId, id);
    try {
      const company = await this.prisma.company.update({
        where: { id },
        data: input,
      });
      await this.activity.record({
        tenantId,
        actorId,
        action: 'company.updated',
        entityType: 'company',
        entityId: id,
        metadata: { ...input },
      });
      return toCompanyDto(company);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }
      throw error;
    }
  }

  async remove(
    tenantId: string,
    actorId: string,
    id: string,
  ): Promise<CompanyDto> {
    const company = await this.ensureOwned(tenantId, id);
    await this.prisma.company.delete({ where: { id } });
    await this.activity.record({
      tenantId,
      actorId,
      action: 'company.deleted',
      entityType: 'company',
      entityId: id,
    });
    return toCompanyDto(company);
  }

  /** Garante que a empresa existe E pertence ao tenant do contexto. */
  private async ensureOwned(
    tenantId: string,
    id: string,
  ): Promise<PrismaCompany> {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }
}
