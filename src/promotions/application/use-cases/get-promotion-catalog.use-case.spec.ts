import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { GetPromotionCatalogUseCase } from './get-promotion-catalog.use-case';

describe('GetPromotionCatalogUseCase', () => {
  let useCase: GetPromotionCatalogUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPromotionCatalogUseCase,
        {
          provide: PromotionsPolicy,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<GetPromotionCatalogUseCase>(GetPromotionCatalogUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
