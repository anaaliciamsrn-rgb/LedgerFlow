import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithAuth } from '../auth/auth-context';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
    if (!req.auth) {
      throw new Error('AuthContext ausente — TenantContextGuard não rodou');
    }
    return req.auth.tenantId;
  },
);
