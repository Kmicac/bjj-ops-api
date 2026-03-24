import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class ListBillingPlansUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
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

    return this.billingRepository.listBillingPlans({
      organizationId,
      branchId,
    });
  }
}
