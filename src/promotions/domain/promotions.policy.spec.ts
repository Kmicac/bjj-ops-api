import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../auth/access-control.service';
import { PromotionsPolicy } from './promotions.policy';

describe('PromotionsPolicy', () => {
  let policy: PromotionsPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsPolicy,
        {
          provide: AccessControlService,
          useValue: {},
        },
      ],
    }).compile();

    policy = module.get<PromotionsPolicy>(PromotionsPolicy);
  });

  it('should be defined', () => {
    expect(policy).toBeDefined();
  });
});
