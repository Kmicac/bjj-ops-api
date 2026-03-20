import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const isDevelopment =
      this.configService.getOrThrow<string>('NODE_ENV') === 'development';
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const normalizedError = this.normalizeException(exception, isDevelopment);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(normalizedError.logMessage, normalizedError.stack);
    } else {
      this.logger.warn(normalizedError.logMessage);
    }

    response.status(status).json({
      statusCode: status,
      error: normalizedError.error,
      message: normalizedError.message,
      path: request.originalUrl,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private normalizeException(exception: unknown, isDevelopment: boolean) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          error: exception.name,
          message: response,
          logMessage: `${exception.getStatus()} ${response}`,
          stack: isDevelopment ? exception.stack : undefined,
        };
      }

      const payload = response as {
        error?: string;
        message?: string | string[];
      };
      const message = payload.message ?? exception.message;

      return {
        error: payload.error ?? exception.name,
        message,
        logMessage: `${exception.getStatus()} ${Array.isArray(message) ? message.join(', ') : message}`,
        stack: isDevelopment ? exception.stack : undefined,
      };
    }

    if (exception instanceof Error) {
      return {
        error: 'InternalServerError',
        message: 'Internal server error',
        logMessage: exception.message,
        stack: isDevelopment ? exception.stack : undefined,
      };
    }

    return {
      error: 'InternalServerError',
      message: 'Internal server error',
      logMessage: 'Unhandled non-error exception thrown',
      stack: undefined,
    };
  }
}
