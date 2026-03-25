import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListIntegrationSyncJobsQueryDto } from '../../dto/list-integration-sync-jobs.query.dto';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class ListIntegrationSyncJobsUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    integrationId: string,
    query: ListIntegrationSyncJobsQueryDto,
  ) {
    const connection =
      await this.integrationsRepository.getIntegrationConnectionManagementTarget(
        organizationId,
        integrationId,
      );
    this.integrationsPolicy.ensureCanManageConnection(principal, connection);

    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } = await this.integrationsRepository.listIntegrationSyncJobs(
      {
        organizationId,
        integrationConnectionId: connection.id,
        syncKind: query.syncKind,
        status: query.status,
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
