import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

jest.mock('../generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, string | number> = {
                DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/bjj_ops_test',
                DATABASE_POOL_MAX: 5,
                NODE_ENV: 'test',
              };

              return values[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
