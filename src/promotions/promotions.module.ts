import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ApprovePromotionUseCase } from './application/use-cases/approve-promotion.use-case';
import { CreatePromotionRequestUseCase } from './application/use-cases/create-promotion-request.use-case';
import { GetPromotionDetailUseCase } from './application/use-cases/get-promotion-detail.use-case';
import { ListPromotionsUseCase } from './application/use-cases/list-promotions.use-case';
import { RejectPromotionUseCase } from './application/use-cases/reject-promotion.use-case';
import { UpsertPromotionEvaluationUseCase } from './application/use-cases/upsert-promotion-evaluation.use-case';
import { PromotionsController } from './promotions.controller';
import { PromotionsPolicy } from './domain/promotions.policy';
import { PromotionsRepository } from './infrastructure/promotions.repository';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PromotionsController],
  providers: [
    PromotionsRepository,
    PromotionsPolicy,
    CreatePromotionRequestUseCase,
    ListPromotionsUseCase,
    GetPromotionDetailUseCase,
    UpsertPromotionEvaluationUseCase,
    ApprovePromotionUseCase,
    RejectPromotionUseCase,
  ],
})
export class PromotionsModule {}
