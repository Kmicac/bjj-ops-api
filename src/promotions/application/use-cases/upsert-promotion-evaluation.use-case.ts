import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpsertPromotionEvaluationDto } from '../../dto/upsert-promotion-evaluation.dto';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';

@Injectable()
export class UpsertPromotionEvaluationUseCase {
  constructor(
    private readonly promotionsPolicy: PromotionsPolicy,
    private readonly promotionsRepository: PromotionsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    promotionId: string,
    dto: UpsertPromotionEvaluationDto,
  ) {
    const promotion = await this.promotionsRepository.getPromotionDetailForAccess(
      organizationId,
      promotionId,
    );

    this.promotionsPolicy.ensureCanEditEvaluation(
      principal,
      organizationId,
      promotion,
    );

    const signals = await this.promotionsRepository.computePromotionSignals(
      organizationId,
      promotion.studentId,
    );

    const evaluation = await this.promotionsRepository.upsertPromotionEvaluation({
      organizationId,
      promotionRequestId: promotionId,
      updatedByMembershipId: principal.membershipId,
      signals,
      guardScore: dto.guardScore,
      passingScore: dto.passingScore,
      controlScore: dto.controlScore,
      escapesDefenseScore: dto.escapesDefenseScore,
      submissionsScore: dto.submissionsScore,
      tacticalUnderstandingScore: dto.tacticalUnderstandingScore,
      attitudeDisciplineScore: dto.attitudeDisciplineScore,
      commitmentConsistencyScore: dto.commitmentConsistencyScore,
      teamworkRespectScore: dto.teamworkRespectScore,
      coachNotes: dto.coachNotes?.trim(),
      recommendation: dto.recommendation,
    });

    await this.auditService.create({
      organizationId,
      branchId: promotion.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'promotion_evaluation.updated',
      entityType: 'PromotionRequest',
      entityId: promotionId,
      metadata: {
        recommendation: evaluation.recommendation,
      },
    });

    return this.promotionsRepository.getPromotionDetailForAccess(
      organizationId,
      promotionId,
    );
  }
}
