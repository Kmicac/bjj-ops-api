import {
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from '../../generated/prisma/enums';

export type DuplicateReviewPayment = {
  id: string;
  paymentKind: PaymentKind;
  studentId: string | null;
  grossAmount: { toString(): string };
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  externalProvider: string | null;
  externalReference: string | null;
  recordedAt: Date;
  description: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

type DuplicateReason =
  | 'same_external_reference'
  | 'same_student_amount_method_window';

export type PossibleDuplicateGroup = {
  reason: DuplicateReason;
  payments: DuplicateReviewPayment[];
};

function normalizeReference(value: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function normalizeDescription(value: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

export function findPossibleDuplicatePayments(
  payments: DuplicateReviewPayment[],
  windowDays = 3,
) {
  const groups: PossibleDuplicateGroup[] = [];
  const windowMs = windowDays * 86400000;

  const paymentsByReference = new Map<string, DuplicateReviewPayment[]>();
  for (const payment of payments) {
    const reference = normalizeReference(payment.externalReference);
    if (!reference) {
      continue;
    }

    const key = `${payment.paymentKind}:${payment.externalProvider ?? 'manual'}:${reference}`;
    const existing = paymentsByReference.get(key) ?? [];
    existing.push(payment);
    paymentsByReference.set(key, existing);
  }

  for (const group of paymentsByReference.values()) {
    if (group.length > 1) {
      groups.push({
        reason: 'same_external_reference',
        payments: [...group].sort(
          (left, right) =>
            right.recordedAt.getTime() - left.recordedAt.getTime(),
        ),
      });
    }
  }

  const paymentsBySimilarity = new Map<string, DuplicateReviewPayment[]>();
  for (const payment of payments) {
    const normalizedDescription = normalizeDescription(payment.description);
    const similarityKey = payment.studentId
      ? [
          payment.studentId,
          payment.paymentKind,
          payment.method,
          payment.currency,
          payment.grossAmount.toString(),
        ].join(':')
      : normalizedDescription
        ? [
            payment.paymentKind,
            payment.method,
            payment.currency,
            payment.grossAmount.toString(),
            normalizedDescription,
          ].join(':')
        : null;

    if (!similarityKey) {
      continue;
    }

    const existing = paymentsBySimilarity.get(similarityKey) ?? [];
    existing.push(payment);
    paymentsBySimilarity.set(similarityKey, existing);
  }

  for (const group of paymentsBySimilarity.values()) {
    if (group.length < 2) {
      continue;
    }

    const sortedGroup = [...group].sort(
      (left, right) => left.recordedAt.getTime() - right.recordedAt.getTime(),
    );

    let currentCluster: DuplicateReviewPayment[] = [sortedGroup[0]];

    for (let index = 1; index < sortedGroup.length; index += 1) {
      const currentPayment = sortedGroup[index];
      const previousPayment = currentCluster[currentCluster.length - 1];

      if (
        currentPayment.recordedAt.getTime() -
          previousPayment.recordedAt.getTime() <=
        windowMs
      ) {
        currentCluster.push(currentPayment);
        continue;
      }

      if (currentCluster.length > 1) {
        groups.push({
          reason: 'same_student_amount_method_window',
          payments: [...currentCluster].sort(
            (left, right) =>
              right.recordedAt.getTime() - left.recordedAt.getTime(),
          ),
        });
      }

      currentCluster = [currentPayment];
    }

    if (currentCluster.length > 1) {
      groups.push({
        reason: 'same_student_amount_method_window',
        payments: [...currentCluster].sort(
          (left, right) =>
            right.recordedAt.getTime() - left.recordedAt.getTime(),
        ),
      });
    }
  }

  return groups.sort((left, right) => {
    const leftTime = left.payments[0]?.recordedAt.getTime() ?? 0;
    const rightTime = right.payments[0]?.recordedAt.getTime() ?? 0;
    return rightTime - leftTime;
  });
}
