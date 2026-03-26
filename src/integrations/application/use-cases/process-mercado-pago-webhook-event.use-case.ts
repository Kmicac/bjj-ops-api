import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  IntegrationWebhookProcessingStatus,
  IntegrationWebhookValidationStatus,
} from '../../../generated/prisma/enums';
import { ObserveMercadoPagoPaymentWebhookUseCase } from '../../../billing/application/use-cases/observe-mercado-pago-payment-webhook.use-case';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { MercadoPagoProviderClient } from '../../infrastructure/provider-clients/mercado-pago-provider.client';

function asSafeErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Mercado Pago webhook processing failed';
}

function compactJsonRecord(value: Record<string, unknown>) {
  return Object.entries(value).reduce<Record<string, unknown>>(
    (carry, [key, entry]) => {
      if (entry !== undefined) {
        carry[key] = entry;
      }

      return carry;
    },
    {},
  );
}

@Injectable()
export class ProcessMercadoPagoWebhookEventUseCase {
  constructor(
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly integrationProviderConfigService: IntegrationProviderConfigService,
    private readonly mercadoPagoProviderClient: MercadoPagoProviderClient,
    private readonly observeMercadoPagoPaymentWebhookUseCase: ObserveMercadoPagoPaymentWebhookUseCase,
  ) {}

  async execute(eventId: string, options?: { force?: boolean }) {
    const event = await this.integrationsRepository.getWebhookEventById(eventId);
    const force = options?.force === true;

    if (event.validationStatus !== IntegrationWebhookValidationStatus.VALID) {
      return event;
    }

    if (
      !force &&
      (event.processingStatus === IntegrationWebhookProcessingStatus.PROCESSED ||
        event.processingStatus === IntegrationWebhookProcessingStatus.IGNORED)
    ) {
      return event;
    }

    await this.integrationsRepository.updateWebhookEvent({
      eventId,
      processingStatus: IntegrationWebhookProcessingStatus.PROCESSING,
      processingError: null,
    });

    try {
      if (
        event.notificationType !== 'payment' ||
        !event.integrationConnectionId ||
        !event.organizationId ||
        !event.branchId ||
        !event.externalResourceId
      ) {
        return this.integrationsRepository.updateWebhookEvent({
          eventId,
          processingStatus: IntegrationWebhookProcessingStatus.IGNORED,
          processingError: 'notification_not_supported',
          processedAt: new Date(),
        });
      }

      const connection =
        await this.integrationsRepository.getIntegrationConnectionManagementTarget(
          event.organizationId,
          event.integrationConnectionId,
        );
      const providerConfig =
        this.integrationProviderConfigService.resolveConfigForProvider(
          connection.provider,
          connection.configJson,
        );

      if (!providerConfig) {
        throw new Error(
          'Mercado Pago credentials are not configured for this branch integration',
        );
      }

      const payment = await this.mercadoPagoProviderClient.getPaymentById(
        providerConfig,
        event.externalResourceId,
      );
      const billingResult =
        await this.observeMercadoPagoPaymentWebhookUseCase.execute({
          organizationId: event.organizationId,
          branchId: event.branchId,
          webhookEventId: event.id,
          integrationConnectionId: event.integrationConnectionId,
          paymentId: payment.id,
          externalReference: payment.externalReference,
          paymentStatus: payment.status,
          paymentStatusDetail: payment.statusDetail,
          transactionAmount: payment.transactionAmount,
          currency: payment.currency,
          dateCreated: payment.dateCreated,
          dateApproved: payment.dateApproved,
          dateLastUpdated: payment.dateLastUpdated,
          observedAt: new Date(),
        });

      return this.integrationsRepository.updateWebhookEvent({
        eventId,
        processingStatus:
          billingResult.outcome === 'updated'
            ? IntegrationWebhookProcessingStatus.PROCESSED
            : IntegrationWebhookProcessingStatus.IGNORED,
        processingError:
          billingResult.outcome === 'updated' ? null : billingResult.reason,
        resourceJson: compactJsonRecord({
          paymentId: payment.id,
          externalReference: payment.externalReference,
          status: payment.status,
          statusDetail: payment.statusDetail,
          transactionAmount: payment.transactionAmount,
          currency: payment.currency,
          liveMode: payment.liveMode,
          dateCreated: payment.dateCreated,
          dateApproved: payment.dateApproved,
          dateLastUpdated: payment.dateLastUpdated,
          billingOutcome: billingResult.outcome,
          billingReason:
            billingResult.outcome === 'updated'
              ? undefined
              : billingResult.reason,
          paymentRecordId:
            billingResult.outcome === 'updated'
              ? billingResult.paymentRecordId
              : undefined,
          paymentRecordStatus:
            billingResult.outcome === 'updated'
              ? billingResult.paymentRecordStatus
              : undefined,
          billingChargeStatus:
            billingResult.outcome === 'updated'
              ? billingResult.chargeStatus
              : undefined,
          paymentRecordAction:
            billingResult.outcome === 'updated'
              ? billingResult.paymentRecordAction
              : undefined,
        }) as Prisma.InputJsonObject,
        processedAt: new Date(),
      });
    } catch (error) {
      return this.integrationsRepository.updateWebhookEvent({
        eventId,
        processingStatus: IntegrationWebhookProcessingStatus.FAILED,
        processingError: asSafeErrorMessage(error),
        processedAt: new Date(),
      });
    }
  }
}
