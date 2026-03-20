import { Test, TestingModule } from '@nestjs/testing';
import { GetPublicBranchDetailUseCase } from './application/use-cases/get-public-branch-detail.use-case';
import { SearchPublicBranchesUseCase } from './application/use-cases/search-public-branches.use-case';
import { PublicBranchesController } from './public-branches.controller';

describe('PublicBranchesController', () => {
  let controller: PublicBranchesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicBranchesController],
      providers: [
        {
          provide: SearchPublicBranchesUseCase,
          useValue: {},
        },
        {
          provide: GetPublicBranchDetailUseCase,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<PublicBranchesController>(PublicBranchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
