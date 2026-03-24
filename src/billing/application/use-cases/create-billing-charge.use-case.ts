import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreateBillingChargeDto } from '../../dto/create-billing-charge.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class CreateBillingChargeUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    dto: CreateBillingChargeDto,
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

    const linkedMembership = dto.studentMembershipId
      ? await this.billingRepository.getStudentMembershipById(
          organizationId,
          studentId,
          dto.studentMembershipId,
        )
      : await this.billingRepository.getStudentCurrentMembership(
          organizationId,
          studentId,
          student.primaryBranchId,
        );

    const linkedPlan = dto.billingPlanId
      ? await this.billingRepository.getBillingPlanAccessTarget(
          organizationId,
          dto.billingPlanId,
        )
      : (linkedMembership?.billingPlan ?? null);

    if (linkedPlan) {
      this.billingPolicy.ensurePlanAssignableToBranch(
        linkedPlan,
        student.primaryBranchId,
      );

      if (linkedPlan.currency !== dto.currency.trim().toUpperCase()) {
        throw new ConflictException(
          'Charge currency must match the linked billing plan currency',
        );
      }
    }

    if (
      linkedMembership &&
      linkedMembership.branchId !== student.primaryBranchId
    ) {
      throw new ConflictException(
        'Student membership does not belong to the same branch billing context',
      );
    }

    const charge = await this.billingRepository.createBillingCharge({
      organizationId,
      branchId: student.primaryBranchId,
      studentId,
      studentMembershipId: linkedMembership?.id,
      billingPlanId: linkedPlan?.id,
      chargeType: dto.chargeType,
      periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
      periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      dueDate: new Date(dto.dueDate),
      amount: new Prisma.Decimal(dto.amount),
      currency: dto.currency.trim().toUpperCase(),
      description: dto.description?.trim(),
      externalProvider: dto.externalProvider?.trim(),
      externalReference: dto.externalReference?.trim(),
    });

    await this.auditService.create({
      organizationId,
      branchId: student.primaryBranchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'billing_charge.created',
      entityType: 'BillingCharge',
      entityId: charge.id,
      metadata: {
        studentId,
        chargeType: charge.chargeType,
        dueDate: charge.dueDate.toISOString(),
        amount: charge.amount.toString(),
        currency: charge.currency,
      },
    });

    return charge;
  }
}
