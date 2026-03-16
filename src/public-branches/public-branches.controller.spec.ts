import { Test, TestingModule } from '@nestjs/testing';
import { PublicBranchesController } from './public-branches.controller';

describe('PublicBranchesController', () => {
  let controller: PublicBranchesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicBranchesController],
    }).compile();

    controller = module.get<PublicBranchesController>(PublicBranchesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
