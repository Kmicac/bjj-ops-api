import { Test, TestingModule } from '@nestjs/testing';
import { PublicBranchesService } from './public-branches.service';

describe('PublicBranchesService', () => {
  let service: PublicBranchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicBranchesService],
    }).compile();

    service = module.get<PublicBranchesService>(PublicBranchesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
