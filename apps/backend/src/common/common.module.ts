import { Module } from '@nestjs/common';
import { TenantContextGuard } from './guards/tenant-context.guard';

/**
 * Peças transversais reutilizáveis. ConfigModule é global, então o guard
 * consegue injetar o ConfigService onde for usado.
 */
@Module({
  providers: [TenantContextGuard],
  exports: [TenantContextGuard],
})
export class CommonModule {}
