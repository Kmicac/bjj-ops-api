import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { StudentMembershipStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreateStudentMembershipDto } from '../../dto/create-student-membership.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class CreateStudentMembershipUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    dto: CreateStudentMembershipDto,
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

    const [policyState, planTarget] = await Promise.all([
      this.billingRepository.getOrCreateBillingPolicy(
        organizationId,
        student.primaryBranchId,
      ),
      this.billingRepository.getBillingPlanAccessTarget(
        organizationId,
        dto.billingPlanId,
      ),
    ]);

    this.billingPolicy.ensurePlanAssignableToBranch(
      planTarget,
      student.primaryBranchId,
    );

    const startedAt = new Date(dto.startedAt);
    const nextBillingDate = dto.nextBillingDate
      ? new Date(dto.nextBillingDate)
      : undefined;
    const freezeStartAt = dto.freezeStartAt
      ? new Date(dto.freezeStartAt)
      : undefined;
    const freezeEndAt = dto.freezeEndAt ? new Date(dto.freezeEndAt) : undefined;
    const status = dto.status ?? StudentMembershipStatus.ACTIVE;

    this.billingPolicy.ensureValidMembershipDates({
      startedAt,
      nextBillingDate,
      freezeStartAt,
      freezeEndAt,
    });
    this.billingPolicy.ensureDiscountAllowed(
      policyState,
      planTarget,
      dto.discountType,
      dto.discountValue,
    );
    this.billingPolicy.ensureFreezeAllowed(
      policyState,
      status,
      freezeStartAt,
      freezeEndAt,
    );

    const membership = await this.billingRepository.createStudentMembership({
      organizationId,
      branchId: student.primaryBranchId,
      studentId,
      billingPlanId: dto.billingPlanId,
      status,
      startedAt,
      nextBillingDate,
      freezeStartAt,
      freezeEndAt,
      discountType: dto.discountType,
      discountValue:
        dto.discountValue === undefined
          ? undefined
          : new Prisma.Decimal(dto.discountValue),
      notes: dto.notes?.trim(),
    });

    await this.auditService.create({
      organizationId,
      branchId: student.primaryBranchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'student_membership.created',
      entityType: 'StudentMembership',
      entityId: membership.id,
      metadata: {
        studentId,
        billingPlanId: membership.billingPlanId,
        status: membership.status,
      },
    });

    return membership;
  }
}
