import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import {
  toCollaboratorDto,
  type CollaboratorDto,
  type CreateCollaboratorInput,
  type UpdateCollaboratorInput,
} from './collaborator.schema';

/** Código do Prisma para violação de índice único. */
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class CollaboratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  /** Ativos primeiro, depois alfabético — a UI mostra os inativos no fim. */
  async list(tenantId: string): Promise<CollaboratorDto[]> {
    const rows = await this.prisma.collaborator.findMany({
      where: { tenantId },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toCollaboratorDto);
  }

  async create(
    tenantId: string,
    actorId: string,
    input: CreateCollaboratorInput,
  ): Promise<CollaboratorDto> {
    try {
      const created = await this.prisma.collaborator.create({
        data: { tenantId, name: input.name, color: input.color },
      });
      await this.activity.record({
        tenantId,
        actorId,
        action: 'collaborator.created',
        entityType: 'collaborator',
        entityId: created.id,
      });
      return toCollaboratorDto(created);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async update(
    tenantId: string,
    actorId: string,
    id: string,
    input: UpdateCollaboratorInput,
  ): Promise<CollaboratorDto> {
    await this.ensureOwned(tenantId, id);
    try {
      const updated = await this.prisma.collaborator.update({
        where: { id },
        data: input,
      });
      await this.activity.record({
        tenantId,
        actorId,
        action: 'collaborator.updated',
        entityType: 'collaborator',
        entityId: id,
      });
      return toCollaboratorDto(updated);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  /**
   * Confere que o id pertence ao tenant antes de qualquer escrita — sem isso,
   * um id de outro escritório seria atualizado sem reclamar.
   */
  private async ensureOwned(tenantId: string, id: string): Promise<void> {
    const found = await this.prisma.collaborator.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Responsável não encontrado');
    }
  }

  private translateUniqueViolation(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return new ConflictException('Já existe um responsável com esse nome');
    }
    return error;
  }
}
