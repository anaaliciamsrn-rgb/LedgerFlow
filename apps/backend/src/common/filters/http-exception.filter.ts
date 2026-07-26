import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
} as const;

function statusToCode(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return API_ERROR_CODES.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return API_ERROR_CODES.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return API_ERROR_CODES.NOT_FOUND;
    case HttpStatus.UNPROCESSABLE_ENTITY:
    case HttpStatus.BAD_REQUEST:
      return API_ERROR_CODES.VALIDATION;
    default:
      return status >= 500
        ? API_ERROR_CODES.SERVER
        : API_ERROR_CODES.UNKNOWN;
  }
}

interface ErrorBody {
  code: string;
  message: string;
  status: number;
  details?: Record<string, readonly string[]>;
}

/**
 * Serializa qualquer erro no envelope esperado pelo frontend:
 * { code, message, status, details? }.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let details: Record<string, readonly string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const obj = response as Record<string, unknown>;
        if (typeof obj.message === 'string') {
          message = obj.message;
        } else if (Array.isArray(obj.message)) {
          message = obj.message.join(', ');
        }
        if (obj.details && typeof obj.details === 'object') {
          details = obj.details as Record<string, readonly string[]>;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(exception);
    }

    const body: ErrorBody = {
      code: statusToCode(status),
      message,
      status,
    };
    if (details) {
      body.details = details;
    }

    res.status(status).json(body);
  }
}
