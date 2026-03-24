import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListPaymentsQueryDto } from '../../dto/list-payments.query.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class ListBranchPaymentsUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    query: ListPaymentsQueryDto,
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

    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } = await this.billingRepository.listBranchPayments({
      organizationId,
      branchId,
      studentId: query.studentId,
      method: query.method,
      status: query.status,
      paymentKind: query.paymentKind,
      currency: query.currency?.trim().toUpperCase(),
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      skip,
      take,
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
