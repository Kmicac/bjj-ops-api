import {
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from '../../generated/prisma/enums';
import {
  DuplicateReviewPayment,
  findPossibleDuplicatePayments,
} from './possible-duplicate-payments';

function buildPayment(
  id: string,
  overrides?: Partial<DuplicateReviewPayment>,
): DuplicateReviewPayment {
  return {
    id,
    paymentKind: PaymentKind.STUDENT_PAYMENT,
    studentId: 'student_1',
    grossAmount: { toString: () => '100.00' },
    currency: 'USD',
    method: PaymentMethod.CASH,
    status: PaymentStatus.APPROVED,
    externalProvider: null,
    externalReference: null,
    recordedAt: new Date('2026-03-23T12:00:00.000Z'),
    description: 'Monthly fee',
    student: {
      id: 'student_1',
      firstName: 'Ana',
      lastName: 'Silva',
    },
    ...overrides,
  };
}

describe('findPossibleDuplicatePayments', () => {
  it('does not mix student payments with general income when grouping by external reference', () => {
    const groups = findPossibleDuplicatePayments([
      buildPayment('payment_1', {
        paymentKind: PaymentKind.STUDENT_PAYMENT,
        externalProvider: 'manual',
        externalReference: 'ref-123',
      }),
      buildPayment('payment_2', {
        paymentKind: PaymentKind.GENERAL_INCOME,
        studentId: null,
        student: null,
        description: 'Retail sale',
        externalProvider: 'manual',
        externalReference: 'ref-123',
      }),
    ]);

    expect(groups).toHaveLength(0);
  });

  it('avoids noisy similarity matches for general income without a description', () => {
    const groups = findPossibleDuplicatePayments([
      buildPayment('payment_1', {
        paymentKind: PaymentKind.GENERAL_INCOME,
        studentId: null,
        student: null,
        description: null,
      }),
      buildPayment('payment_2', {
        paymentKind: PaymentKind.GENERAL_INCOME,
        studentId: null,
        student: null,
        description: null,
        recordedAt: new Date('2026-03-24T12:00:00.000Z'),
      }),
    ]);

    expect(groups).toHaveLength(0);
  });

  it('still flags likely duplicate student payments with the same amount, method and window', () => {
    const groups = findPossibleDuplicatePayments([
      buildPayment('payment_1', {
        recordedAt: new Date('2026-03-23T12:00:00.000Z'),
      }),
      buildPayment('payment_2', {
        recordedAt: new Date('2026-03-24T09:00:00.000Z'),
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      reason: 'same_student_amount_method_window',
    });
    expect(groups[0]?.payments.map((payment) => payment.id)).toEqual([
      'payment_2',
      'payment_1',
    ]);
  });
});
