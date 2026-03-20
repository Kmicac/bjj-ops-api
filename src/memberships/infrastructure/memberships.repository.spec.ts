import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipsRepository } from './memberships.repository';

describe('MembershipsRepository', () => {
  let repository: MembershipsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsRepository,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    repository = module.get<MembershipsRepository>(MembershipsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
