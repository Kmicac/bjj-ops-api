import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateBillingPlanDto } from '../../dto/update-billing-plan.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class UpdateBillingPlanUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    planId: string,
    dto: UpdateBillingPlanDto,
  ) {
    const planTarget = await this.billingRepository.getBillingPlanAccessTarget(
      organizationId,
      planId,
    );

    if (planTarget.branchId !== branchId) {
      throw new ConflictException(
        'Billing plan does not belong to the requested branch',
      );
    }

    this.billingPolicy.ensureCanManageBranchBilling(
      principal,
      organizationId,
      planTarget.branch,
    );

    const plan = await this.billingRepository.updateBillingPlan({
      planId,
      name: dto.name?.trim(),
      description: dto.description?.trim(),
      billingFrequency: dto.billingFrequency,
      amount:
        dto.amount === undefined ? undefined : new Prisma.Decimal(dto.amount),
      currency: dto.currency?.trim().toUpperCase(),
      enrollmentFeeAmount:
        dto.enrollmentFeeAmount === undefined
          ? undefined
          : new Prisma.Decimal(dto.enrollmentFeeAmount),
      isActive: dto.isActive,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'billing_plan.updated',
      entityType: 'BillingPlan',
      entityId: plan.id,
      metadata: {
        billingFrequency: plan.billingFrequency,
        amount: plan.amount.toString(),
        currency: plan.currency,
        isActive: plan.isActive,
      },
    });

    return plan;
  }
}
