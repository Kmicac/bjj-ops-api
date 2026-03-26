import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  IntegrationProvider,
  IntegrationWebhookProcessingStatus,
  IntegrationWebhookValidationStatus,
} from '../../generated/prisma/enums';

type WebhookEventPolicyTarget = {
  provider: IntegrationProvider;
  deliveryId: string | null;
  notificationType: string | null;
  action: string | null;
  externalEventId: string | null;
  externalResourceId: string | null;
  validationStatus: IntegrationWebhookValidationStatus;
  validationError: string | null;
  processingStatus: IntegrationWebhookProcessingStatus;
  processingError: string | null;
  payloadJson: Prisma.JsonValue;
  resourceJson: Prisma.JsonValue | null;
  queryJson: Prisma.JsonValue | null;
  headersJson: Prisma.JsonValue | null;
  receivedAt: Date;
  processedAt: Date | null;
  reprocessCount: number;
  lastReprocessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function isPlainObject(value: Prisma.JsonValue | null): value is Record<string, Prisma.JsonValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalString(
  value: Prisma.JsonValue | null | undefined,
): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

@Injectable()
export class IntegrationWebhookEventsPolicy {
  private readonly recoverableIgnoredReasonsByProvider: Readonly<
    Record<IntegrationProvider, readonly string[]>
  > = {
    [IntegrationProvider.MERCADO_PAGO]: [
      'charge_not_found',
      'charge_not_linked_to_mercado_pago',
    ],
    [IntegrationProvider.TAKENOS]: [],
    [IntegrationProvider.SMOOTHCOMP]: [],
  };

  getRecoverableIgnoredReasons(provider: IntegrationProvider) {
    return [...(this.recoverableIgnoredReasonsByProvider[provider] ?? [])];
  }

  isRecoverable(event: WebhookEventPolicyTarget) {
    if (event.validationStatus !== IntegrationWebhookValidationStatus.VALID) {
      return false;
    }

    if (event.processingStatus === IntegrationWebhookProcessingStatus.PROCESSED) {
      return false;
    }

    if (event.processingStatus === IntegrationWebhookProcessingStatus.PROCESSING) {
      return false;
    }

    if (
      event.processingStatus === IntegrationWebhookProcessingStatus.RECEIVED ||
      event.processingStatus === IntegrationWebhookProcessingStatus.FAILED
    ) {
      return true;
    }

    if (event.processingStatus !== IntegrationWebhookProcessingStatus.IGNORED) {
      return false;
    }

    return this.getRecoverableIgnoredReasons(event.provider).includes(
      event.processingError ?? '',
    );
  }

  getRecoverabilityReason(event: WebhookEventPolicyTarget) {
    if (event.validationStatus !== IntegrationWebhookValidationStatus.VALID) {
      return 'invalid_event';
    }

    if (event.processingStatus === IntegrationWebhookProcessingStatus.PROCESSED) {
      return 'already_processed';
    }

    if (event.processingStatus === IntegrationWebhookProcessingStatus.PROCESSING) {
      return 'already_processing';
    }

    if (event.processingStatus === IntegrationWebhookProcessingStatus.RECEIVED) {
      return 'received_not_processed_yet';
    }

    if (event.processingStatus === IntegrationWebhookProcessingStatus.FAILED) {
      return 'failed_processing';
    }

    if (
      event.processingStatus === IntegrationWebhookProcessingStatus.IGNORED &&
      this.getRecoverableIgnoredReasons(event.provider).includes(
        event.processingError ?? '',
      )
    ) {
      return 'recoverable_ignored_state';
    }

    return 'not_recoverable';
  }

  ensureCanReprocess(event: WebhookEventPolicyTarget) {
    if (!this.isRecoverable(event)) {
      throw new ConflictException(
        'Integration webhook event is not recoverable and cannot be reprocessed',
      );
    }
  }

  buildListItem(event: WebhookEventPolicyTarget & { id: string }) {
    return {
      id: event.id,
      provider: event.provider,
      notificationType: event.notificationType,
      action: event.action,
      externalEventId: event.externalEventId,
      externalResourceId: event.externalResourceId,
      requestId: this.getRequestId(event),
      validationStatus: event.validationStatus,
      processingStatus: event.processingStatus,
      errorSummary: event.validationError ?? event.processingError,
      isRecoverable: this.isRecoverable(event),
      recoverabilityReason: this.getRecoverabilityReason(event),
      reprocessCount: event.reprocessCount,
      lastReprocessedAt: event.lastReprocessedAt,
      receivedAt: event.receivedAt,
      processedAt: event.processedAt,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  buildDetail(event: WebhookEventPolicyTarget & { id: string }) {
    return {
      id: event.id,
      provider: event.provider,
      notificationType: event.notificationType,
      action: event.action,
      externalEventId: event.externalEventId,
      externalResourceId: event.externalResourceId,
      requestId: this.getRequestId(event),
      validationStatus: event.validationStatus,
      validationError: event.validationError,
      processingStatus: event.processingStatus,
      processingError: event.processingError,
      errorSummary: event.validationError ?? event.processingError,
      isRecoverable: this.isRecoverable(event),
      recoverabilityReason: this.getRecoverabilityReason(event),
      wasReprocessed: event.reprocessCount > 0,
      reprocessCount: event.reprocessCount,
      lastReprocessedAt: event.lastReprocessedAt,
      receivedAt: event.receivedAt,
      processedAt: event.processedAt,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      payload: this.buildSanitizedPayload(event.payloadJson),
      query: this.buildSanitizedQuery(event.queryJson),
      resource: this.buildSanitizedResource(event.resourceJson),
    };
  }

  private getRequestId(event: WebhookEventPolicyTarget) {
    if (isPlainObject(event.headersJson)) {
      return readOptionalString(event.headersJson['x-request-id']) ?? event.deliveryId;
    }

    return event.deliveryId;
  }

  private buildSanitizedPayload(value: Prisma.JsonValue) {
    if (!isPlainObject(value)) {
      return null;
    }

    return {
      id: readOptionalString(value.id),
      type: readOptionalString(value.type),
      action: readOptionalString(value.action),
      applicationId: readOptionalString(value.application_id),
      liveMode: typeof value.live_mode === 'boolean' ? value.live_mode : null,
      dataId:
        isPlainObject(value.data) ? readOptionalString(value.data.id) : null,
    };
  }

  private buildSanitizedQuery(value: Prisma.JsonValue | null) {
    if (!isPlainObject(value)) {
      return null;
    }

    return {
      id: readOptionalString(value.id),
      type: readOptionalString(value.type),
      action: readOptionalString(value.action),
      dataId: readOptionalString(value['data.id']),
    };
  }

  private buildSanitizedResource(value: Prisma.JsonValue | null) {
    if (!isPlainObject(value)) {
      return null;
    }

    return {
      paymentId: readOptionalString(value.paymentId),
      externalReference: readOptionalString(value.externalReference),
      status: readOptionalString(value.status),
      statusDetail: readOptionalString(value.statusDetail),
      transactionAmount:
        typeof value.transactionAmount === 'number'
          ? value.transactionAmount
          : null,
      currency: readOptionalString(value.currency),
      dateCreated: readOptionalString(value.dateCreated),
      dateApproved: readOptionalString(value.dateApproved),
      dateLastUpdated: readOptionalString(value.dateLastUpdated),
      billingOutcome: readOptionalString(value.billingOutcome),
      billingReason: readOptionalString(value.billingReason),
      paymentRecordId: readOptionalString(value.paymentRecordId),
      paymentRecordStatus: readOptionalString(value.paymentRecordStatus),
      billingChargeStatus: readOptionalString(value.billingChargeStatus),
      paymentRecordAction: readOptionalString(value.paymentRecordAction),
    };
  }
}
