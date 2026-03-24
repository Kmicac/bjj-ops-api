import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { findPossibleDuplicatePayments } from '../possible-duplicate-payments';
import {
  buildBranchStudentFinancialViews,
  countBranchStudentFinancialStatuses,
} from '../student-financial-views';
import { GetBillingSummaryQueryDto } from '../../dto/get-billing-summary.query.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getCurrentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

@Injectable()
export class GetBranchBillingSummaryUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    query: GetBillingSummaryQueryDto,
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
    const dateFrom = query.dateFrom ?? toIsoDate(getCurrentMonthStart());
    const dateTo = query.dateTo ?? toIsoDate(new Date());
    const currency = query.currency?.trim().toUpperCase();

    const [summary, duplicateCandidates, branchFinancialData] =
      await Promise.all([
        this.billingRepository.getBranchBillingSummaryData({
          organizationId,
          branchId,
          dateFrom,
          dateTo,
          currency,
          graceDays: branchPolicy.graceDays,
        }),
        this.billingRepository.listPaymentsForDuplicateReview({
          organizationId,
          branchId,
          currency,
          dateFrom,
          dateTo,
          take: 250,
        }),
        this.billingRepository.getBranchStudentFinancialStatusData({
          organizationId,
          branchId,
          graceDays: branchPolicy.graceDays,
        }),
      ]);
    const studentFinancialViews = buildBranchStudentFinancialViews({
      billingPolicy: this.billingPolicy,
      memberships: branchFinancialData.memberships,
      charges: branchFinancialData.charges,
      graceDays: branchPolicy.graceDays,
      restrictAttendanceWhenOverdue: branchPolicy.restrictAttendanceWhenOverdue,
      restrictAppUsageWhenOverdue: branchPolicy.restrictAppUsageWhenOverdue,
    });
    const studentFinancialStatusCounts = countBranchStudentFinancialStatuses(
      studentFinancialViews,
    );

    return {
      ...summary,
      possibleDuplicatesCount:
        findPossibleDuplicatePayments(duplicateCandidates).length,
      period: {
        dateFrom,
        dateTo,
      },
      currency,
      operationalSnapshot: {
        asOf: new Date().toISOString(),
        studentFinancialStatusCounts,
        overdueStudentsCount: studentFinancialStatusCounts.OVERDUE,
        dueSoonStudentsCount: studentFinancialStatusCounts.DUE_SOON,
        restrictedStudentsCount: studentFinancialStatusCounts.RESTRICTED,
      },
    };
  }
}
