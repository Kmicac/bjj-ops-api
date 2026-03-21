import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';
import { RejectPromotionUseCase } from './reject-promotion.use-case';

describe('RejectPromotionUseCase', () => {
  let useCase: RejectPromotionUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RejectPromotionUseCase,
        { provide: PromotionsPolicy, useValue: {} },
        { provide: PromotionsRepository, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    useCase = module.get<RejectPromotionUseCase>(RejectPromotionUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
