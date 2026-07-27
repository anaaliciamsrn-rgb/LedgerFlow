import {
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ZodError, ZodType, ZodTypeDef } from 'zod';

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
 *
 * O tipo de **entrada** do schema é `unknown`, não `T`: o que chega do HTTP é
 * sempre string ou JSON cru. Amarrar entrada e saída ao mesmo tipo (o que
 * `ZodSchema<T>` faz) recusaria qualquer schema com `.transform()` — por
 * exemplo, uma query string `'true'` que vira `boolean`.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

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
