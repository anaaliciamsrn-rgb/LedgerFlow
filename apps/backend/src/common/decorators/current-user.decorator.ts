import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext, RequestWithAuth } from '../auth/auth-context';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
    if (!req.auth) {
      throw new Error('AuthContext ausente — TenantContextGuard não rodou');
    }
    return req.auth;
  },
);
