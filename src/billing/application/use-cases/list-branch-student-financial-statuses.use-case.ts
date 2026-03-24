import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { buildBranchStudentFinancialViews } from '../student-financial-views';
import { ListBranchStudentFinancialStatusesQueryDto } from '../../dto/list-branch-student-financial-statuses.query.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class ListBranchStudentFinancialStatusesUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    query: ListBranchStudentFinancialStatusesQueryDto,
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
    const branchFinancialData =
      await this.billingRepository.getBranchStudentFinancialStatusData({
        organizationId,
        branchId,
        graceDays: branchPolicy.graceDays,
      });
    const allItems = buildBranchStudentFinancialViews({
      billingPolicy: this.billingPolicy,
      memberships: branchFinancialData.memberships,
      charges: branchFinancialData.charges,
      graceDays: branchPolicy.graceDays,
      restrictAttendanceWhenOverdue: branchPolicy.restrictAttendanceWhenOverdue,
      restrictAppUsageWhenOverdue: branchPolicy.restrictAppUsageWhenOverdue,
    });
    const filteredItems = query.financialStatus
      ? allItems.filter(
          (item) => item.financialStatus === query.financialStatus,
        )
      : allItems;
    const { page, limit, skip, take } = buildPagination(query);

    return {
      items: filteredItems.slice(skip, skip + take),
      meta: {
        page,
        limit,
        total: filteredItems.length,
      },
    };
  }
}
