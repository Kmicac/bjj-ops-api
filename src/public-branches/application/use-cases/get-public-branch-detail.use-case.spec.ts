import { Test, TestingModule } from '@nestjs/testing';
import { PublicBranchesRepository } from '../../infrastructure/public-branches.repository';
import { GetPublicBranchDetailUseCase } from './get-public-branch-detail.use-case';

describe('GetPublicBranchDetailUseCase', () => {
  let useCase: GetPublicBranchDetailUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPublicBranchDetailUseCase,
        {
          provide: PublicBranchesRepository,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<GetPublicBranchDetailUseCase>(
      GetPublicBranchDetailUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
