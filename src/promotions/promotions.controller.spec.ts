import { Test, TestingModule } from '@nestjs/testing';
import { ApprovePromotionUseCase } from './application/use-cases/approve-promotion.use-case';
import { CreatePromotionRequestUseCase } from './application/use-cases/create-promotion-request.use-case';
import { GetPromotionDetailUseCase } from './application/use-cases/get-promotion-detail.use-case';
import { ListPromotionsUseCase } from './application/use-cases/list-promotions.use-case';
import { RejectPromotionUseCase } from './application/use-cases/reject-promotion.use-case';
import { UpsertPromotionEvaluationUseCase } from './application/use-cases/upsert-promotion-evaluation.use-case';
import { PromotionsController } from './promotions.controller';

describe('PromotionsController', () => {
  let controller: PromotionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionsController],
      providers: [
        { provide: CreatePromotionRequestUseCase, useValue: {} },
        { provide: ListPromotionsUseCase, useValue: {} },
        { provide: GetPromotionDetailUseCase, useValue: {} },
        { provide: UpsertPromotionEvaluationUseCase, useValue: {} },
        { provide: ApprovePromotionUseCase, useValue: {} },
        { provide: RejectPromotionUseCase, useValue: {} },
      ],
    }).compile();

    controller = module.get<PromotionsController>(PromotionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
