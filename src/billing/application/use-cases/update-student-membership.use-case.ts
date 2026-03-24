import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { StudentMembershipStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateStudentMembershipDto } from '../../dto/update-student-membership.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

function toCurrentDateOnly() {
  return new Date(new Date().toISOString().slice(0, 10));
}

@Injectable()
export class UpdateStudentMembershipUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    dto: UpdateStudentMembershipDto,
  ) {
    const student = await this.billingRepository.getStudentBillingTarget(
      organizationId,
      studentId,
    );
    this.billingPolicy.ensureCanOperateStudentBilling(
      principal,
      organizationId,
      student.primaryBranch,
    );

    const [policyState, membership] = await Promise.all([
      this.billingRepository.getOrCreateBillingPolicy(
        organizationId,
        student.primaryBranchId,
      ),
      this.billingRepository.getRequiredStudentCurrentMembership(
        organizationId,
        studentId,
        student.primaryBranchId,
      ),
    ]);

    const planTarget = dto.billingPlanId
      ? await this.billingRepository.getBillingPlanAccessTarget(
          organizationId,
          dto.billingPlanId,
        )
      : membership.billingPlan;

    this.billingPolicy.ensurePlanAssignableToBranch(
      planTarget,
      student.primaryBranchId,
    );

    const status = dto.status ?? membership.status;
    const startedAt = dto.startedAt
      ? new Date(dto.startedAt)
      : membership.startedAt;
    const endedAt =
      dto.endedAt !== undefined
        ? new Date(dto.endedAt)
        : status === StudentMembershipStatus.CANCELED ||
            status === StudentMembershipStatus.ENDED
          ? (membership.endedAt ?? toCurrentDateOnly())
          : dto.status
            ? null
            : membership.endedAt;

    const clearFreezeSchedule = dto.clearFreezeSchedule ?? false;
    const clearDiscount = dto.clearDiscount ?? false;

    const freezeStartAt = clearFreezeSchedule
      ? null
      : dto.freezeStartAt !== undefined
        ? new Date(dto.freezeStartAt)
        : dto.status && status !== StudentMembershipStatus.FROZEN
          ? null
          : membership.freezeStartAt;
    const freezeEndAt = clearFreezeSchedule
      ? null
      : dto.freezeEndAt !== undefined
        ? new Date(dto.freezeEndAt)
        : dto.status && status !== StudentMembershipStatus.FROZEN
          ? null
          : membership.freezeEndAt;

    const discountType = clearDiscount
      ? null
      : dto.discountType !== undefined
        ? dto.discountType
        : membership.discountType;
    const discountValue = clearDiscount
      ? null
      : dto.discountValue !== undefined
        ? new Prisma.Decimal(dto.discountValue)
        : membership.discountValue;
    const nextBillingDate =
      dto.nextBillingDate !== undefined
        ? new Date(dto.nextBillingDate)
        : membership.nextBillingDate;

    this.billingPolicy.ensureValidMembershipDates({
      startedAt,
      endedAt,
      nextBillingDate,
      freezeStartAt,
      freezeEndAt,
    });
    this.billingPolicy.ensureDiscountAllowed(
      policyState,
      planTarget,
      discountType,
      discountValue?.toNumber(),
    );
    this.billingPolicy.ensureFreezeAllowed(
      policyState,
      status,
      freezeStartAt,
      freezeEndAt,
    );

    const updatedMembership =
      await this.billingRepository.updateStudentMembership({
        membershipId: membership.id,
        billingPlanId: dto.billingPlanId,
        status,
        startedAt,
        endedAt,
        nextBillingDate,
        freezeStartAt,
        freezeEndAt,
        discountType,
        discountValue,
        notes: dto.notes?.trim() ?? membership.notes ?? undefined,
      });

    await this.auditService.create({
      organizationId,
      branchId: student.primaryBranchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'student_membership.updated',
      entityType: 'StudentMembership',
      entityId: updatedMembership.id,
      metadata: {
        studentId,
        billingPlanId: updatedMembership.billingPlanId,
        status: updatedMembership.status,
      },
    });

    return updatedMembership;
  }
}
