import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreatePromotionRequestDto } from '../../dto/create-promotion-request.dto';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';

@Injectable()
export class CreatePromotionRequestUseCase {
  constructor(
    private readonly promotionsPolicy: PromotionsPolicy,
    private readonly promotionsRepository: PromotionsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    dto: CreatePromotionRequestDto,
  ) {
    const student = await this.promotionsRepository.getStudentPromotionTarget(
      organizationId,
      studentId,
    );
    this.promotionsPolicy.ensureCanPropose(
      principal,
      organizationId,
      student.primaryBranch,
    );
    this.promotionsPolicy.ensureValidRequestedPromotion(dto, student);

    const existingPending =
      await this.promotionsRepository.getPendingPromotionForStudent(
        organizationId,
        studentId,
      );
    this.promotionsPolicy.ensureNoPendingPromotionConflict(existingPending);

    const signals = await this.promotionsRepository.computePromotionSignals(
      organizationId,
      studentId,
    );

    const promotionRequest =
      await this.promotionsRepository.createPromotionRequestWithEvaluation({
        organizationId,
        branchId: student.primaryBranchId,
        studentId,
        proposedByMembershipId: principal.membershipId,
        type: dto.type,
        trackSnapshot: student.promotionTrack,
        currentBeltSnapshot: student.currentBelt,
        currentStripesSnapshot: student.currentStripes,
        targetBelt: dto.targetBelt,
        targetStripes: dto.targetStripes,
        proposalNotes: dto.proposalNotes?.trim(),
        signals,
      });

    await this.auditService.create({
      organizationId,
      branchId: student.primaryBranchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'promotion_request.created',
      entityType: 'PromotionRequest',
      entityId: promotionRequest.id,
      metadata: {
        studentId,
        trackSnapshot: promotionRequest.trackSnapshot,
        type: promotionRequest.type,
        targetBelt: promotionRequest.targetBelt,
        targetStripes: promotionRequest.targetStripes,
      },
    });

    return promotionRequest;
  }
}
