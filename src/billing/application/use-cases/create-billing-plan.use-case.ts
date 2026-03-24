import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreateBillingPlanDto } from '../../dto/create-billing-plan.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class CreateBillingPlanUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    dto: CreateBillingPlanDto,
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

    const plan = await this.billingRepository.createBillingPlan({
      organizationId,
      branchId,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      billingFrequency: dto.billingFrequency,
      amount: new Prisma.Decimal(dto.amount),
      currency: dto.currency.trim().toUpperCase(),
      enrollmentFeeAmount:
        dto.enrollmentFeeAmount === undefined
          ? undefined
          : new Prisma.Decimal(dto.enrollmentFeeAmount),
      isActive: dto.isActive ?? true,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'billing_plan.created',
      entityType: 'BillingPlan',
      entityId: plan.id,
      metadata: {
        billingFrequency: plan.billingFrequency,
        amount: plan.amount.toString(),
        currency: plan.currency,
      },
    });

    return plan;
  }
}
