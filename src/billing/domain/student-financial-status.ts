export const STUDENT_FINANCIAL_STATUSES = [
  'CURRENT',
  'DUE_SOON',
  'OVERDUE',
  'RESTRICTED',
  'FROZEN',
] as const;

export type StudentFinancialStatus =
  (typeof STUDENT_FINANCIAL_STATUSES)[number];

export const STUDENT_FINANCIAL_STATUS_PRIORITY: Record<
  StudentFinancialStatus,
  number
> = {
  RESTRICTED: 0,
  OVERDUE: 1,
  DUE_SOON: 2,
  FROZEN: 3,
  CURRENT: 4,
};

export const BILLING_DUE_SOON_WINDOW_DAYS = 5;

export type ActiveBillingRestrictionFlags = {
  attendanceRestricted: boolean;
  appUsageRestricted: boolean;
};
