import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BranchesRepository } from './branches.repository';

describe('BranchesRepository', () => {
  let repository: BranchesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesRepository,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    repository = module.get<BranchesRepository>(BranchesRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
