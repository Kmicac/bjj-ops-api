import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';
import { ApprovePromotionUseCase } from './approve-promotion.use-case';

describe('ApprovePromotionUseCase', () => {
  let useCase: ApprovePromotionUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovePromotionUseCase,
        { provide: PromotionsPolicy, useValue: {} },
        { provide: PromotionsRepository, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    useCase = module.get<ApprovePromotionUseCase>(ApprovePromotionUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
