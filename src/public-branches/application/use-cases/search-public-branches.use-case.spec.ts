import { Test, TestingModule } from '@nestjs/testing';
import { PublicBranchesRepository } from '../../infrastructure/public-branches.repository';
import { SearchPublicBranchesUseCase } from './search-public-branches.use-case';

describe('SearchPublicBranchesUseCase', () => {
  let useCase: SearchPublicBranchesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchPublicBranchesUseCase,
        {
          provide: PublicBranchesRepository,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<SearchPublicBranchesUseCase>(
      SearchPublicBranchesUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
