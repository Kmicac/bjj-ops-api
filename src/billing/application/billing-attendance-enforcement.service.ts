import { Injectable } from '@nestjs/common';
import {
  buildBranchStudentFinancialViews,
  type BranchStudentFinancialView,
} from './student-financial-views';
import { BillingPolicy } from '../domain/billing.policy';
import { BillingRepository } from '../infrastructure/billing.repository';

type AttendanceBillingStudent = {
  id: string;
  firstName: string;
  lastName: string;
};

@Injectable()
export class BillingAttendanceEnforcementService {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
  ) {}

  async getStudentAttendanceRestrictionStates(params: {
    organizationId: string;
    branchId: string;
    students: AttendanceBillingStudent[];
  }): Promise<BranchStudentFinancialView[]> {
    if (!params.students.length) {
      return [];
    }

    const branchPolicy = await this.billingRepository.getOrCreateBillingPolicy(
      params.organizationId,
      params.branchId,
    );
    const branchFinancialData =
      await this.billingRepository.getBranchStudentFinancialStatusDataForStudents(
        {
          organizationId: params.organizationId,
          branchId: params.branchId,
          studentIds: params.students.map((student) => student.id),
          graceDays: branchPolicy.graceDays,
        },
      );

    return buildBranchStudentFinancialViews({
      billingPolicy: this.billingPolicy,
      students: params.students,
      memberships: branchFinancialData.memberships,
      charges: branchFinancialData.charges,
      graceDays: branchPolicy.graceDays,
      restrictAttendanceWhenOverdue: branchPolicy.restrictAttendanceWhenOverdue,
      restrictAppUsageWhenOverdue: branchPolicy.restrictAppUsageWhenOverdue,
    });
  }
}
