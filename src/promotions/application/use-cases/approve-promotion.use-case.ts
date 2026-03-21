import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { ApprovePromotionDto } from '../../dto/approve-promotion.dto';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';

@Injectable()
export class ApprovePromotionUseCase {
  constructor(
    private readonly promotionsPolicy: PromotionsPolicy,
    private readonly promotionsRepository: PromotionsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    promotionId: string,
    dto: ApprovePromotionDto,
  ) {
    const promotion = await this.promotionsRepository.getPromotionDetailForAccess(
      organizationId,
      promotionId,
    );
    const effectiveDate = dto.effectiveDate
      ? new Date(dto.effectiveDate)
      : new Date();

    this.promotionsPolicy.ensureCanApprove(principal, organizationId, promotion);
    this.promotionsPolicy.ensureEvaluationSupportsApproval(promotion);
    const nextStudentState = this.promotionsPolicy.buildApprovedStudentState(
      promotion,
      effectiveDate,
    );

    const approvedPromotion =
      await this.promotionsRepository.approvePromotionAndApplyToStudent({
        organizationId,
        promotionId,
        studentId: promotion.studentId,
        reviewedByMembershipId: principal.membershipId,
        type: promotion.type,
        promotionTrack: nextStudentState.promotionTrack,
        targetBelt: promotion.targetBelt,
        targetStripes: nextStudentState.currentStripes,
        effectiveDate,
        decisionNotes: dto.decisionNotes?.trim(),
      });

    await this.auditService.create({
      organizationId,
      branchId: promotion.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'promotion_request.approved',
      entityType: 'PromotionRequest',
      entityId: promotionId,
      metadata: {
        type: approvedPromotion?.type,
        effectiveDate: approvedPromotion?.effectiveDate,
      },
    });

    return approvedPromotion;
  }
}
