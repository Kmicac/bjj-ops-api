import { Prisma } from '../../../generated/prisma/client';
import { BillingChargeStatus } from '../../../generated/prisma/enums';
import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

function sumDecimalValues(values: Prisma.Decimal[]) {
  return values.reduce(
    (accumulator, currentValue) => accumulator.plus(currentValue),
    new Prisma.Decimal(0),
  );
}

@Injectable()
export class GetStudentBillingContextUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
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
    const recentPaymentsSince = new Date();
    recentPaymentsSince.setUTCDate(recentPaymentsSince.getUTCDate() - 90);

    const contextData =
      await this.billingRepository.getStudentBillingContextData({
        organizationId,
        branchId: student.primaryBranchId,
        studentId,
        graceDays: branchPolicy.graceDays,
        recentPaymentsSince,
      });

    const pendingCharges = contextData.charges.filter(
      (charge) =>
        charge.effectiveStatus === BillingChargeStatus.PENDING ||
        charge.effectiveStatus === BillingChargeStatus.PARTIALLY_PAID,
    );
    const overdueCharges = contextData.charges.filter(
      (charge) => charge.effectiveStatus === BillingChargeStatus.OVERDUE,
    );
    const totalDue = sumDecimalValues([
      ...pendingCharges.map((charge) => charge.outstandingAmount),
      ...overdueCharges.map((charge) => charge.outstandingAmount),
    ]);
    const derivedState = this.billingPolicy.deriveStudentFinancialState({
      membershipStatus: contextData.membership?.status ?? null,
      charges: contextData.charges,
      graceDays: branchPolicy.graceDays,
      restrictAttendanceWhenOverdue: branchPolicy.restrictAttendanceWhenOverdue,
      restrictAppUsageWhenOverdue: branchPolicy.restrictAppUsageWhenOverdue,
    });

    return {
      membership: contextData.membership,
      financialStatus: derivedState.financialStatus,
      daysOverdue: derivedState.daysOverdue,
      nextDueDate: derivedState.nextDueDate,
      hasOverdueCharges: derivedState.hasOverdueCharges,
      hasPendingCharges: derivedState.hasPendingCharges,
      upcomingCharges: pendingCharges.slice(0, 3),
      pendingCharges,
      overdueCharges,
      totalDue,
      totalPaidRecent: contextData.recentApprovedPaymentsTotal,
      activeRestrictionFlags: derivedState.activeRestrictionFlags,
      flags: {
        restrictAttendance:
          derivedState.activeRestrictionFlags.attendanceRestricted,
        restrictAppUsage:
          derivedState.activeRestrictionFlags.appUsageRestricted,
      },
    };
  }
}
