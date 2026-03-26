import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { IntegrationWebhookEventsPolicy } from '../../domain/integration-webhook-events.policy';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class GetIntegrationWebhookEventUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationWebhookEventsPolicy: IntegrationWebhookEventsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
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

    const event = await this.integrationsRepository.getWebhookEventById(eventId);

    if (
      event.organizationId !== organizationId ||
      event.integrationConnectionId !== integrationId
    ) {
      throw new NotFoundException('Integration webhook event not found');
    }

    return this.integrationWebhookEventsPolicy.buildDetail(event);
  }
}
