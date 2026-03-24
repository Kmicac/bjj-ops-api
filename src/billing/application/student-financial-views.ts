import { Prisma } from '../../generated/prisma/client';
import type {
  BillingChargeStatus,
  StudentMembershipStatus,
} from '../../generated/prisma/enums';
import { BillingPolicy } from '../domain/billing.policy';
import {
  STUDENT_FINANCIAL_STATUS_PRIORITY,
  type StudentFinancialStatus,
} from '../domain/student-financial-status';

type BranchStudentMembershipSnapshot = {
  id: string;
  studentId: string;
  status: StudentMembershipStatus;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

type BranchStudentChargeSnapshot = {
  studentId: string;
  dueDate: Date;
  effectiveStatus: BillingChargeStatus;
  outstandingAmount: Prisma.Decimal;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

type BranchStudentRosterEntry = {
  id: string;
  firstName: string;
  lastName: string;
};

export type BranchStudentFinancialView = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  membership: {
    id: string;
    status: StudentMembershipStatus;
  } | null;
  financialStatus: StudentFinancialStatus;
  daysOverdue: number;
  nextDueDate: Date | null;
  hasOverdueCharges: boolean;
  hasPendingCharges: boolean;
  activeRestrictionFlags: {
    attendanceRestricted: boolean;
    appUsageRestricted: boolean;
  };
  totalDue: Prisma.Decimal;
};

function sumDecimalValues(values: Prisma.Decimal[]) {
  return values.reduce(
    (accumulator, currentValue) => accumulator.plus(currentValue),
    new Prisma.Decimal(0),
  );
}

export function buildBranchStudentFinancialViews(params: {
  billingPolicy: BillingPolicy;
  students?: BranchStudentRosterEntry[];
  memberships: BranchStudentMembershipSnapshot[];
  charges: BranchStudentChargeSnapshot[];
  graceDays: number;
  restrictAttendanceWhenOverdue: boolean;
  restrictAppUsageWhenOverdue: boolean;
  now?: Date;
}) {
  const students = new Map<
    string,
    {
      student: BranchStudentFinancialView['student'];
      membership: BranchStudentFinancialView['membership'];
      charges: BranchStudentChargeSnapshot[];
    }
  >();

  for (const student of params.students ?? []) {
    students.set(student.id, {
      student,
      membership: null,
      charges: [],
    });
  }

  for (const membership of params.memberships) {
    students.set(membership.studentId, {
      student: membership.student,
      membership: {
        id: membership.id,
        status: membership.status,
      },
      charges: students.get(membership.studentId)?.charges ?? [],
    });
  }

  for (const charge of params.charges) {
    const currentEntry = students.get(charge.studentId);
    students.set(charge.studentId, {
      student: currentEntry?.student ?? charge.student,
      membership: currentEntry?.membership ?? null,
      charges: [...(currentEntry?.charges ?? []), charge],
    });
  }

  return [...students.values()]
    .map((entry) => {
      const derivedState = params.billingPolicy.deriveStudentFinancialState({
        membershipStatus: entry.membership?.status ?? null,
        charges: entry.charges,
        graceDays: params.graceDays,
        restrictAttendanceWhenOverdue: params.restrictAttendanceWhenOverdue,
        restrictAppUsageWhenOverdue: params.restrictAppUsageWhenOverdue,
        now: params.now,
      });

      return {
        student: entry.student,
        membership: entry.membership,
        ...derivedState,
        totalDue: sumDecimalValues(
          entry.charges.map((charge) => charge.outstandingAmount),
        ),
      } satisfies BranchStudentFinancialView;
    })
    .sort((left, right) => {
      const priorityDifference =
        STUDENT_FINANCIAL_STATUS_PRIORITY[left.financialStatus] -
        STUDENT_FINANCIAL_STATUS_PRIORITY[right.financialStatus];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      if (left.daysOverdue !== right.daysOverdue) {
        return right.daysOverdue - left.daysOverdue;
      }

      const leftDueTime =
        left.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDueTime =
        right.nextDueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (leftDueTime !== rightDueTime) {
        return leftDueTime - rightDueTime;
      }

      const lastNameComparison = left.student.lastName.localeCompare(
        right.student.lastName,
      );
      if (lastNameComparison !== 0) {
        return lastNameComparison;
      }

      return left.student.firstName.localeCompare(right.student.firstName);
    });
}

export function countBranchStudentFinancialStatuses(
  views: BranchStudentFinancialView[],
) {
  return views.reduce(
    (accumulator, currentValue) => {
      accumulator[currentValue.financialStatus] += 1;
      return accumulator;
    },
    {
      CURRENT: 0,
      DUE_SOON: 0,
      OVERDUE: 0,
      RESTRICTED: 0,
      FROZEN: 0,
    } as Record<StudentFinancialStatus, number>,
  );
}
