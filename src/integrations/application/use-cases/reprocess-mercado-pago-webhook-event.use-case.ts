import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import {
  IntegrationProvider,
} from '../../../generated/prisma/enums';
import { IntegrationWebhookEventsPolicy } from '../../domain/integration-webhook-events.policy';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { ProcessMercadoPagoWebhookEventUseCase } from './process-mercado-pago-webhook-event.use-case';

@Injectable()
export class ReprocessMercadoPagoWebhookEventUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationWebhookEventsPolicy: IntegrationWebhookEventsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly processMercadoPagoWebhookEventUseCase: ProcessMercadoPagoWebhookEventUseCase,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    integrationId: string,
    eventId: string,
  ) {
    const connection =
      await this.integrationsRepository.getIntegrationConnectionManagementTarget(
        organizationId,
        integrationId,
      );
    this.integrationsPolicy.ensureCanManageConnection(principal, connection);

    if (connection.provider !== IntegrationProvider.MERCADO_PAGO) {
      throw new ConflictException(
        'Webhook reprocessing is only implemented for Mercado Pago in this iteration',
      );
    }

    const event = await this.integrationsRepository.getWebhookEventById(eventId);

    if (
      event.provider !== IntegrationProvider.MERCADO_PAGO ||
      event.organizationId !== organizationId ||
      event.integrationConnectionId !== integrationId
    ) {
      throw new NotFoundException('Integration webhook event not found');
    }

    this.integrationWebhookEventsPolicy.ensureCanReprocess(event);
    const reprocessedAt = new Date();
    const trackedEvent =
      await this.integrationsRepository.markWebhookEventReprocessed({
        eventId: event.id,
        reprocessedAt,
      });

    const reprocessedEvent =
      await this.processMercadoPagoWebhookEventUseCase.execute(event.id, {
        force: true,
      });

    await this.auditService.create({
      organizationId,
      branchId: connection.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'integration_webhook_event.reprocessed',
      entityType: 'IntegrationWebhookEvent',
      entityId: event.id,
      metadata: {
        integrationConnectionId: integrationId,
        provider: event.provider,
        previousProcessingStatus: event.processingStatus,
        reprocessCount: trackedEvent.reprocessCount,
        lastReprocessedAt: trackedEvent.lastReprocessedAt,
        nextProcessingStatus: reprocessedEvent.processingStatus,
      },
    });

    return reprocessedEvent;
  }
}
