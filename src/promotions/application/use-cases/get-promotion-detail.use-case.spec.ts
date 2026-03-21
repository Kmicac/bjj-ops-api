import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';
import { GetPromotionDetailUseCase } from './get-promotion-detail.use-case';

describe('GetPromotionDetailUseCase', () => {
  let useCase: GetPromotionDetailUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPromotionDetailUseCase,
        { provide: PromotionsPolicy, useValue: {} },
        { provide: PromotionsRepository, useValue: {} },
      ],
    }).compile();

    useCase = module.get<GetPromotionDetailUseCase>(GetPromotionDetailUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
