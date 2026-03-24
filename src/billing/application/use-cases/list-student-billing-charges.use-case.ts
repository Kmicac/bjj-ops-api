import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListBillingChargesQueryDto } from '../../dto/list-billing-charges.query.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class ListStudentBillingChargesUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    query: ListBillingChargesQueryDto,
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

    const branchPolicy = await this.billingRepository.getOrCreateBillingPolicy(
      organizationId,
      student.primaryBranchId,
    );
    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } =
      await this.billingRepository.listStudentBillingCharges({
        organizationId,
        branchId: student.primaryBranchId,
        studentId,
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
