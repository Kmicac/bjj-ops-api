import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';
import { CreatePromotionRequestUseCase } from './create-promotion-request.use-case';

describe('CreatePromotionRequestUseCase', () => {
  let useCase: CreatePromotionRequestUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePromotionRequestUseCase,
        { provide: PromotionsPolicy, useValue: {} },
        { provide: PromotionsRepository, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    useCase = module.get<CreatePromotionRequestUseCase>(CreatePromotionRequestUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
