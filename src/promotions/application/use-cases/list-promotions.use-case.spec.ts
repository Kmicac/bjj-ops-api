import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';
import { ListPromotionsUseCase } from './list-promotions.use-case';

describe('ListPromotionsUseCase', () => {
  let useCase: ListPromotionsUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListPromotionsUseCase,
        { provide: PromotionsPolicy, useValue: {} },
        { provide: PromotionsRepository, useValue: {} },
      ],
    }).compile();

    useCase = module.get<ListPromotionsUseCase>(ListPromotionsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
