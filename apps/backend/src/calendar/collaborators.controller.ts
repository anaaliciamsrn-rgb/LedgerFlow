import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantContextGuard } from '../common/guards/tenant-context.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/auth/auth-context';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CollaboratorsService } from './collaborators.service';
import {
  createCollaboratorSchema,
  updateCollaboratorSchema,
  type CollaboratorDto,
  type CreateCollaboratorInput,
  type UpdateCollaboratorInput,
} from './collaborator.schema';

@Controller('calendar/collaborators')
@UseGuards(TenantContextGuard)
export class CollaboratorsController {
  constructor(private readonly collaborators: CollaboratorsService) {}

  @Get()
  list(@TenantId() tenantId: string): Promise<CollaboratorDto[]> {
    return this.collaborators.list(tenantId);
  }

  @Post()
  create(
    @CurrentUser() auth: AuthContext,
    @Body(new ZodValidationPipe(createCollaboratorSchema))
    body: CreateCollaboratorInput,
  ): Promise<CollaboratorDto> {
    return this.collaborators.create(auth.tenantId, auth.userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCollaboratorSchema))
    body: UpdateCollaboratorInput,
  ): Promise<CollaboratorDto> {
    return this.collaborators.update(auth.tenantId, auth.userId, id, body);
  }
}
