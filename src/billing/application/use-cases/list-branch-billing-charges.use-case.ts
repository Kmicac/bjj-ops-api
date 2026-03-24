import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListBillingChargesQueryDto } from '../../dto/list-billing-charges.query.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class ListBranchBillingChargesUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    query: ListBillingChargesQueryDto,
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

    const branchPolicy = await this.billingRepository.getOrCreateBillingPolicy(
      organizationId,
      branchId,
    );
    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } =
      await this.billingRepository.listBranchBillingCharges({
        organizationId,
        branchId,
        studentId: query.studentId,
        billingPlanId: query.billingPlanId,
        chargeType: query.chargeType,
        status: query.status,
        currency: query.currency?.trim().toUpperCase(),
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        skip,
        take,
        graceDays: branchPolicy.graceDays,
      });

    return {
      items,
      meta: {
        page,
        limit,
        total,
      },
    };
  }
}
