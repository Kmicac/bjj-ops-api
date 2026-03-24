import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { findPossibleDuplicatePayments } from '../possible-duplicate-payments';
import { ReviewPossibleDuplicatesQueryDto } from '../../dto/review-possible-duplicates.query.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class ReviewPossibleDuplicatePaymentsUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    query: ReviewPossibleDuplicatesQueryDto,
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

    const dateTo = query.dateTo ?? toIsoDate(new Date());
    const defaultDateFrom = new Date();
    defaultDateFrom.setUTCDate(defaultDateFrom.getUTCDate() - 30);
    const dateFrom = query.dateFrom ?? toIsoDate(defaultDateFrom);
    const windowDays = query.windowDays ?? 3;
    const inspectedPayments =
      await this.billingRepository.listPaymentsForDuplicateReview({
        organizationId,
        branchId,
        studentId: query.studentId,
        method: query.method,
        status: query.status,
        paymentKind: query.paymentKind,
        currency: query.currency?.trim().toUpperCase(),
        dateFrom,
        dateTo,
        take: query.limit ?? 100,
      });
    const items = findPossibleDuplicatePayments(inspectedPayments, windowDays);

    return {
      items,
      meta: {
        inspectedPayments: inspectedPayments.length,
        totalGroups: items.length,
        windowDays,
        period: {
          dateFrom,
          dateTo,
        },
      },
    };
  }
}
