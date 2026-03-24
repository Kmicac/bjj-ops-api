import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';
import { CreateBillingPlanUseCase } from './create-billing-plan.use-case';

describe('CreateBillingPlanUseCase', () => {
  let useCase: CreateBillingPlanUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBillingPlanUseCase,
        {
          provide: BillingPolicy,
          useValue: {},
        },
        {
          provide: BillingRepository,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<CreateBillingPlanUseCase>(CreateBillingPlanUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
