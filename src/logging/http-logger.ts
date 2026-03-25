import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import pinoHttp from 'pino-http';

type HttpLoggerOptions = {
  isDevelopment: boolean;
  level: string;
};

type RequestWithId = IncomingMessage & {
  id?: string;
  requestId?: string;
  method?: string;
  url?: string;
  socket: IncomingMessage['socket'];
};

type ResponseWithStatus = ServerResponse<IncomingMessage> & {
  statusCode: number;
};

export function createHttpLogger(options: HttpLoggerOptions) {
  return pinoHttp({
    level: options.level,
    quietReqLogger: true,
    quietResLogger: true,
    genReqId: (req, res) => {
      const request = req as RequestWithId;
      const incomingRequestId = req.headers['x-request-id'];
      const headerRequestId =
        typeof incomingRequestId === 'string' && incomingRequestId.length > 0
          ? incomingRequestId
          : undefined;
      const requestId = headerRequestId ?? request.requestId ?? randomUUID();

      request.id = requestId;
      request.requestId = requestId;
      res.setHeader('x-request-id', requestId);

      return requestId;
    },
    customProps: (req) => ({
      requestId: (req as RequestWithId).requestId,
    }),
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) {
        return 'error';
      }

      if (res.statusCode >= 400) {
        return 'warn';
      }

      return 'info';
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.x-api-key',
        'req.body.configJson',
        'req.body.configJson.accessToken',
        'req.body.configJson.publicKey',
        'req.body.configJson.clientSecret',
        'req.body.configJson.token',
      ],
      remove: true,
    },
    serializers: {
      req: (req) => {
        const request = req as RequestWithId;

        return {
          id: request.requestId,
          method: request.method,
          url: request.url,
          ip: request.socket?.remoteAddress,
        };
      },
      res: (res) => {
        const response = res as ResponseWithStatus;

        return {
          statusCode: response.statusCode,
        };
      },
      err: (err) => ({
        type: err.name,
        message: err.message,
        stack: options.isDevelopment ? err.stack : undefined,
      }),
    },
  });
}
