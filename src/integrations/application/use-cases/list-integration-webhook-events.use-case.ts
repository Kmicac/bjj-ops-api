import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListIntegrationWebhookEventsQueryDto } from '../../dto/list-integration-webhook-events.query.dto';
import { IntegrationWebhookEventsPolicy } from '../../domain/integration-webhook-events.policy';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class ListIntegrationWebhookEventsUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationWebhookEventsPolicy: IntegrationWebhookEventsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    integrationId: string,
    query: ListIntegrationWebhookEventsQueryDto,
  ) {
    const connection =
      await this.integrationsRepository.getIntegrationConnectionManagementTarget(
        organizationId,
        integrationId,
      );
    this.integrationsPolicy.ensureCanManageConnection(principal, connection);

    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } = await this.integrationsRepository.listWebhookEvents({
      organizationId,
      integrationConnectionId: integrationId,
      validationStatus: query.validationStatus,
      processingStatus: query.processingStatus,
      notificationType: query.notificationType?.trim(),
      externalResourceId: query.externalResourceId?.trim(),
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      onlyRecoverable: query.onlyRecoverable,
      recoverableIgnoredReasons:
        this.integrationWebhookEventsPolicy.getRecoverableIgnoredReasons(
          connection.provider,
        ),
      skip,
      take,
    });

    return {
      items: items.map((item) =>
        this.integrationWebhookEventsPolicy.buildListItem(item),
      ),
      meta: {
        page,
        limit,
        total,
      },
    };
  }
}
