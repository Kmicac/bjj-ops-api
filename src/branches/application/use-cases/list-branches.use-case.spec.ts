import { Test, TestingModule } from '@nestjs/testing';
import { BranchesPolicy } from '../../domain/branches.policy';
import { BranchesRepository } from '../../infrastructure/branches.repository';
import { ListBranchesUseCase } from './list-branches.use-case';

describe('ListBranchesUseCase', () => {
  let useCase: ListBranchesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListBranchesUseCase,
        {
          provide: BranchesPolicy,
          useValue: {},
        },
        {
          provide: BranchesRepository,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<ListBranchesUseCase>(ListBranchesUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
