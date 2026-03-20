import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { configureApplication } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InMemoryPrismaService } from './in-memory-prisma';

export async function createE2EApp() {
  process.env.NODE_ENV = 'test';
  process.env.APP_NAME = 'bjj-ops-api-e2e';
  process.env.PORT = '3001';
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/bjj_ops_e2e';
  process.env.DATABASE_POOL_MAX = '5';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  process.env.JWT_ACCESS_SECRET =
    'e2e_super_secret_access_key_minimum_length_12345';
  process.env.JWT_ACCESS_TTL_SECONDS = '900';
  process.env.RATE_LIMIT_TTL_MS = '60000';
  process.env.RATE_LIMIT_LIMIT = '1000';
  process.env.TRUST_PROXY = 'false';
  process.env.LOG_LEVEL = 'silent';

  const { AppModule } = await import('../../src/app.module');
  const prisma = new InMemoryPrismaService();
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleFixture.createNestApplication();
  await configureApplication(app);
  await app.init();

  return {
    app,
    prisma,
  };
}

export async function closeE2EApp(app?: INestApplication) {
  if (app) {
    await app.close();
  }
}
