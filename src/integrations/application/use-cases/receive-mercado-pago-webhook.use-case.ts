import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { IntegrationProvider, IntegrationWebhookProcessingStatus, IntegrationWebhookValidationStatus } from '../../../generated/prisma/enums';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { ProcessMercadoPagoWebhookEventUseCase } from './process-mercado-pago-webhook-event.use-case';
import { MercadoPagoWebhookNotificationDto } from '../../dto/mercado-pago-webhook-notification.dto';
import { MercadoPagoWebhookPolicy } from '../../domain/mercado-pago-webhook.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

function getFirstString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

function compactJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => compactJsonValue(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((carry, [key, entry]) => {
      const compacted = compactJsonValue(entry);

      if (compacted !== undefined) {
        carry[key] = compacted;
      }

      return carry;
    }, {});
  }

  return value === undefined ? undefined : value;
}

function toJsonRecord(value: Record<string, unknown>) {
  return compactJsonValue(value) as Prisma.InputJsonObject;
}

@Injectable()
export class ReceiveMercadoPagoWebhookUseCase {
  constructor(
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly integrationProviderConfigService: IntegrationProviderConfigService,
    private readonly mercadoPagoWebhookPolicy: MercadoPagoWebhookPolicy,
    private readonly processMercadoPagoWebhookEventUseCase: ProcessMercadoPagoWebhookEventUseCase,
  ) {}

  async execute(params: {
    body: MercadoPagoWebhookNotificationDto;
    query: Record<string, string | string[] | undefined>;
    headers: Record<string, string | string[] | undefined>;
  }) {
    const deliveryId = getFirstString(params.headers['x-request-id']);
    const activeConnections =
      await this.integrationsRepository.listActiveBranchConnectionsByProvider(
        IntegrationProvider.MERCADO_PAGO,
      );
    const connectionCandidates = activeConnections.flatMap((connection) => {
      try {
        const providerConfig =
          this.integrationProviderConfigService.resolveConfigForProvider(
            connection.provider,
            connection.configJson,
          );

        return providerConfig
          ? [
              {
                id: connection.id,
                applicationId:
                  typeof providerConfig.applicationId === 'string'
                    ? providerConfig.applicationId
                    : undefined,
                webhookSecret:
                  typeof providerConfig.webhookSecret === 'string'
                    ? providerConfig.webhookSecret
                    : undefined,
              },
            ]
          : [];
      } catch {
        return [];
      }
    });

    const dataId =
      getFirstString(params.query['data.id']) ?? params.body.data?.id;
    const notificationType =
      params.body.type ?? getFirstString(params.query.type);
    const action = params.body.action ?? getFirstString(params.query.action);
    const externalEventId = params.body.id ?? getFirstString(params.query.id);
    const payloadJson = toJsonRecord(
      params.body as unknown as Record<string, unknown>,
    );
    const queryJson = toJsonRecord(params.query);
    const headersJson = this.buildStoredHeaders(params.headers);
    const receivedAt = new Date();

    let validationResult;

    try {
      validationResult = this.mercadoPagoWebhookPolicy.validateSignature({
        xSignature: getFirstString(params.headers['x-signature']),
        xRequestId: deliveryId,
        dataId,
        applicationId: params.body.application_id,
        connections: connectionCandidates,
      });
    } catch (error) {
      return this.rejectInvalidWebhook({
        deliveryId,
        notificationType,
        action,
        externalEventId,
        dataId,
        payloadJson,
        queryJson,
        headersJson,
        receivedAt,
        validationError:
          error instanceof Error
            ? error.message
            : 'Mercado Pago webhook signature could not be validated',
      });
    }

    if (!validationResult) {
      return this.rejectInvalidWebhook({
        deliveryId,
        notificationType,
        action,
        externalEventId,
        dataId,
        payloadJson,
        queryJson,
        headersJson,
        receivedAt,
        validationError: 'Invalid Mercado Pago webhook signature',
      });
    }

    const connection = activeConnections.find(
      (candidate) => candidate.id === validationResult.connectionId,
    );

    if (!connection) {
      throw new ConflictException(
        'Mercado Pago webhook matched an unavailable integration connection',
      );
    }

    if (deliveryId) {
      const existingEvent =
        await this.integrationsRepository.findWebhookEventByProviderAndDeliveryId(
          IntegrationProvider.MERCADO_PAGO,
          deliveryId,
        );

      if (
        existingEvent?.validationStatus ===
          IntegrationWebhookValidationStatus.VALID &&
        existingEvent.processingStatus !==
          IntegrationWebhookProcessingStatus.FAILED
      ) {
        return {
          received: true,
          webhookEventId: existingEvent.id,
          duplicate: true,
        };
      }
    }

    const event = await this.integrationsRepository.createWebhookEvent({
      provider: IntegrationProvider.MERCADO_PAGO,
      organizationId: connection.organizationId,
      branchId: connection.branchId,
      integrationConnectionId: connection.id,
      deliveryId,
      notificationType,
      action,
      externalEventId,
      externalResourceId: validationResult.dataId,
      validationStatus: IntegrationWebhookValidationStatus.VALID,
      processingStatus: IntegrationWebhookProcessingStatus.RECEIVED,
      payloadJson,
      queryJson,
      headersJson,
      receivedAt,
    });

    setImmediate(() => {
      void this.processMercadoPagoWebhookEventUseCase.execute(event.id);
    });

    return {
      received: true,
      webhookEventId: event.id,
      duplicate: false,
    };
  }

  private async rejectInvalidWebhook(params: {
    deliveryId?: string;
    notificationType?: string;
    action?: string;
    externalEventId?: string;
    dataId?: string;
    payloadJson: Prisma.InputJsonObject;
    queryJson: Prisma.InputJsonObject;
    headersJson: Prisma.InputJsonObject;
    receivedAt: Date;
    validationError: string;
  }) {
    await this.integrationsRepository.createWebhookEvent({
      provider: IntegrationProvider.MERCADO_PAGO,
      deliveryId: params.deliveryId,
      notificationType: params.notificationType,
      action: params.action,
      externalEventId: params.externalEventId,
      externalResourceId: params.dataId,
      validationStatus: IntegrationWebhookValidationStatus.INVALID,
      validationError: params.validationError,
      processingStatus: IntegrationWebhookProcessingStatus.IGNORED,
      processingError: 'invalid_signature',
      payloadJson: params.payloadJson,
      queryJson: params.queryJson,
      headersJson: params.headersJson,
      receivedAt: params.receivedAt,
      processedAt: params.receivedAt,
    });

    throw new ForbiddenException('Invalid Mercado Pago webhook signature');
  }

  private buildStoredHeaders(
    headers: Record<string, string | string[] | undefined>,
  ) {
    return toJsonRecord({
      'content-type': getFirstString(headers['content-type']),
      'user-agent': getFirstString(headers['user-agent']),
      'x-request-id': getFirstString(headers['x-request-id']),
      'x-signature': getFirstString(headers['x-signature']),
    });
  }
}
