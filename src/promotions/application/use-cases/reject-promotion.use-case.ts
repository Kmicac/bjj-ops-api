import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { RejectPromotionDto } from '../../dto/reject-promotion.dto';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';

@Injectable()
export class RejectPromotionUseCase {
  constructor(
    private readonly promotionsPolicy: PromotionsPolicy,
    private readonly promotionsRepository: PromotionsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    promotionId: string,
    dto: RejectPromotionDto,
  ) {
    const promotion = await this.promotionsRepository.getPromotionDetailForAccess(
      organizationId,
      promotionId,
    );

    this.promotionsPolicy.ensureCanReject(principal, organizationId, promotion);

    const rejectedPromotion = await this.promotionsRepository.rejectPromotion({
      organizationId,
      promotionId,
      studentId: promotion.studentId,
      reviewedByMembershipId: principal.membershipId,
      rejectionReason: dto.rejectionReason.trim(),
      decisionNotes: dto.decisionNotes?.trim(),
    });

    await this.auditService.create({
      organizationId,
      branchId: promotion.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'promotion_request.rejected',
      entityType: 'PromotionRequest',
      entityId: promotionId,
      metadata: {
        rejectionReason: dto.rejectionReason.trim(),
      },
    });

    return rejectedPromotion;
  }
}
