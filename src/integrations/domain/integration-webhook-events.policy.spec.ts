import type { Prisma } from '../../../generated/prisma/client';
import {
  IntegrationProvider,
  IntegrationWebhookProcessingStatus,
  IntegrationWebhookValidationStatus,
} from '../../generated/prisma/enums';
import { IntegrationWebhookEventsPolicy } from './integration-webhook-events.policy';

function buildEvent(overrides?: Partial<Parameters<IntegrationWebhookEventsPolicy['buildDetail']>[0]>) {
  return {
    id: 'webhook_1',
    provider: IntegrationProvider.MERCADO_PAGO,
    deliveryId: 'req_1',
    notificationType: 'payment',
    action: 'payment.updated',
    externalEventId: 'evt_1',
    externalResourceId: 'payment_123',
    validationStatus: IntegrationWebhookValidationStatus.VALID,
    validationError: null,
    processingStatus: IntegrationWebhookProcessingStatus.FAILED,
    processingError: 'Mercado Pago payment lookup request timed out',
    payloadJson: {
      id: 'evt_1',
      type: 'payment',
      action: 'payment.updated',
      application_id: 'app_1',
      live_mode: false,
      data: {
        id: 'payment_123',
      },
    } satisfies Prisma.JsonObject,
    resourceJson: {
      paymentId: 'payment_123',
      status: 'approved',
      statusDetail: 'accredited',
    } satisfies Prisma.JsonObject,
    queryJson: {
      type: 'payment',
      'data.id': 'payment_123',
    } satisfies Prisma.JsonObject,
    headersJson: {
      'x-request-id': 'req_1',
      'x-signature': 'secret_signature',
    } satisfies Prisma.JsonObject,
    receivedAt: new Date('2026-03-26T10:00:00.000Z'),
    processedAt: new Date('2026-03-26T10:01:00.000Z'),
    reprocessCount: 0,
    lastReprocessedAt: null,
    createdAt: new Date('2026-03-26T10:00:00.000Z'),
    updatedAt: new Date('2026-03-26T10:01:00.000Z'),
    ...overrides,
  };
}

describe('IntegrationWebhookEventsPolicy', () => {
  let policy: IntegrationWebhookEventsPolicy;

  beforeEach(() => {
    policy = new IntegrationWebhookEventsPolicy();
  });

  it('marks failed valid Mercado Pago events as recoverable', () => {
    const event = buildEvent();

    expect(policy.isRecoverable(event)).toBe(true);
    expect(policy.getRecoverabilityReason(event)).toBe('failed_processing');
  });

  it('marks invalid or already processed events as not recoverable', () => {
    expect(
      policy.isRecoverable(
        buildEvent({
          validationStatus: IntegrationWebhookValidationStatus.INVALID,
          processingStatus: IntegrationWebhookProcessingStatus.IGNORED,
          processingError: 'invalid_signature',
        }),
      ),
    ).toBe(false);

    expect(
      policy.isRecoverable(
        buildEvent({
          processingStatus: IntegrationWebhookProcessingStatus.PROCESSED,
          processingError: null,
        }),
      ),
    ).toBe(false);
  });

  it('treats known ignored link-resolution cases as recoverable', () => {
    const event = buildEvent({
      processingStatus: IntegrationWebhookProcessingStatus.IGNORED,
      processingError: 'charge_not_found',
    });

    expect(policy.isRecoverable(event)).toBe(true);
    expect(policy.getRecoverabilityReason(event)).toBe(
      'recoverable_ignored_state',
    );
  });

  it('builds a sanitized detail view without exposing raw signature headers', () => {
    const detail = policy.buildDetail(buildEvent());

    expect(detail.requestId).toBe('req_1');
    expect(detail.payload).toEqual({
      id: 'evt_1',
      type: 'payment',
      action: 'payment.updated',
      applicationId: 'app_1',
      liveMode: false,
      dataId: 'payment_123',
    });
    expect(detail.query).toEqual({
      id: null,
      type: 'payment',
      action: null,
      dataId: 'payment_123',
    });
    expect(JSON.stringify(detail)).not.toContain('x-signature');
  });
});
