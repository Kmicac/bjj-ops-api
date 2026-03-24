import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateBillingPolicyDto } from '../../dto/update-billing-policy.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class UpdateBranchBillingPolicyUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    dto: UpdateBillingPolicyDto,
  ) {
    const branch = await this.billingRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.billingPolicy.ensureCanManageBranchBilling(
      principal,
      organizationId,
      branch,
    );

    const currentPolicy = await this.billingRepository.getOrCreateBillingPolicy(
      organizationId,
      branchId,
    );

    const policy = await this.billingRepository.updateBillingPolicy({
      branchId,
      graceDays: dto.graceDays,
      restrictAttendanceWhenOverdue: dto.restrictAttendanceWhenOverdue,
      restrictAppUsageWhenOverdue: dto.restrictAppUsageWhenOverdue,
      allowFreeze: dto.allowFreeze,
      maxFreezeDaysPerYear:
        dto.allowFreeze === false
          ? null
          : (dto.maxFreezeDaysPerYear ?? currentPolicy.maxFreezeDaysPerYear),
      allowManualDiscounts: dto.allowManualDiscounts,
      allowPartialPayments: dto.allowPartialPayments,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'billing_policy.updated',
      entityType: 'BillingPolicy',
      entityId: policy.id,
      metadata: {
        graceDays: policy.graceDays,
        restrictAttendanceWhenOverdue: policy.restrictAttendanceWhenOverdue,
        restrictAppUsageWhenOverdue: policy.restrictAppUsageWhenOverdue,
        allowFreeze: policy.allowFreeze,
        allowManualDiscounts: policy.allowManualDiscounts,
        allowPartialPayments: policy.allowPartialPayments,
      },
    });

    return policy;
  }
}
