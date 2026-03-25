import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListExternalEntityLinksQueryDto } from '../../dto/list-external-entity-links.query.dto';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class ListExternalEntityLinksUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    integrationId: string,
    query: ListExternalEntityLinksQueryDto,
  ) {
    const connection =
      await this.integrationsRepository.getIntegrationConnectionManagementTarget(
        organizationId,
        integrationId,
      );
    this.integrationsPolicy.ensureCanManageConnection(principal, connection);

    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } = await this.integrationsRepository.listExternalEntityLinks(
      {
        organizationId,
        integrationConnectionId: connection.id,
        entityType: query.entityType,
        internalEntityId: query.internalEntityId,
        externalEntityId: query.externalEntityId,
        skip,
        take,
      },
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
      },
    };
  }
}
