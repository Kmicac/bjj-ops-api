import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../auth/access-control.service';
import { BranchesPolicy } from './branches.policy';

describe('BranchesPolicy', () => {
  let policy: BranchesPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesPolicy,
        {
          provide: AccessControlService,
          useValue: {},
        },
      ],
    }).compile();

    policy = module.get<BranchesPolicy>(BranchesPolicy);
  });

  it('should be defined', () => {
    expect(policy).toBeDefined();
  });
});
