import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const incomingRequestId = request.header('x-request-id');
    const requestId =
      incomingRequestId && incomingRequestId.trim().length > 0
        ? incomingRequestId.trim()
        : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    next();
  }
}
