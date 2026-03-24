import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListPaymentsQueryDto } from '../../dto/list-payments.query.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class ListStudentPaymentsUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    query: ListPaymentsQueryDto,
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

    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } = await this.billingRepository.listStudentPayments({
      organizationId,
      branchId: student.primaryBranchId,
      studentId,
      method: query.method,
      status: query.status,
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
