import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isPaginated(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'pagination' in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

/**
 * Padroniza a saída conforme o contrato do frontend:
 * - respostas paginadas ({ data[], pagination }) passam direto;
 * - qualquer outro retorno é embrulhado em { data }.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, unknown>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(map((value) => (isPaginated(value) ? value : { data: value })));
  }
}
