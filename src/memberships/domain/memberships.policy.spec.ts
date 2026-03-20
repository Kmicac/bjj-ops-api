import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../auth/access-control.service';
import { MembershipsPolicy } from './memberships.policy';

describe('MembershipsPolicy', () => {
  let policy: MembershipsPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsPolicy,
        {
          provide: AccessControlService,
          useValue: {},
        },
      ],
    }).compile();

    policy = module.get<MembershipsPolicy>(MembershipsPolicy);
  });

  it('should be defined', () => {
    expect(policy).toBeDefined();
  });
});
