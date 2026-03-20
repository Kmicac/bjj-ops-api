import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicBranchesRepository } from './public-branches.repository';

describe('PublicBranchesRepository', () => {
  let repository: PublicBranchesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicBranchesRepository,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    repository = module.get<PublicBranchesRepository>(PublicBranchesRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
