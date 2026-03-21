import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';
import { UpsertPromotionEvaluationUseCase } from './upsert-promotion-evaluation.use-case';

describe('UpsertPromotionEvaluationUseCase', () => {
  let useCase: UpsertPromotionEvaluationUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpsertPromotionEvaluationUseCase,
        { provide: PromotionsPolicy, useValue: {} },
        { provide: PromotionsRepository, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    useCase = module.get<UpsertPromotionEvaluationUseCase>(
      UpsertPromotionEvaluationUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
