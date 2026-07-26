import {
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ZodError, ZodSchema } from 'zod';

function flatten(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Valida o payload contra um schema Zod (espelhando os schemas do frontend)
 * e devolve os erros no formato details: Record<string, string[]>.
 * Uso: @Body(new ZodValidationPipe(createCompanySchema)).
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new UnprocessableEntityException({
        message: 'Dados inválidos',
        details: flatten(result.error),
      });
    }
    return result.data;
  }
}
