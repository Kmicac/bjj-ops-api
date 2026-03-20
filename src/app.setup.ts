import {
  ValidationPipe,
  VersioningType,
  type INestApplication,
} from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createHttpLogger } from './logging/http-logger';

export async function configureApplication(app: INestApplication) {
  const configService = app.get(ConfigService);
  const nodeEnv = configService.getOrThrow<string>('NODE_ENV');
  const trustProxy = configService.getOrThrow<boolean>('TRUST_PROXY');

  if (trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(
    createHttpLogger({
      isDevelopment: nodeEnv === 'development',
      level: configService.getOrThrow<string>('LOG_LEVEL'),
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: configService.getOrThrow<string[]>('CORS_ORIGINS'),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization', 'x-request-id'],
  } satisfies CorsOptions);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      disableErrorMessages: nodeEnv === 'production',
      stopAtFirstError: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.enableShutdownHooks();
}
