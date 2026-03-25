import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import {
  IntegrationScopeType,
  MembershipScopeType,
} from '../../../generated/prisma/enums';
import { ListIntegrationsQueryDto } from '../../dto/list-integrations.query.dto';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class ListIntegrationConnectionsUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    query: ListIntegrationsQueryDto,
  ) {
    const { page, limit, skip, take } = buildPagination(query);
    const canManageOrganizationConnections =
      this.integrationsPolicy.canManageOrganizationConnections(
        principal,
        organizationId,
      );

    let branchId = query.branchId;
    let branchIds: string[] | undefined;
    let restrictToBranchLevel = false;

    if (branchId) {
      const branch = await this.integrationsRepository.getBranchAccessTarget(
        organizationId,
        branchId,
      );
      this.integrationsPolicy.ensureCanManageBranchConnections(
        principal,
        organizationId,
        branch,
      );
      restrictToBranchLevel = true;
    } else if (!canManageOrganizationConnections) {
      this.integrationsPolicy.ensureCanListBranchLevelConnections(
        principal,
        organizationId,
      );

      if (query.scopeType === IntegrationScopeType.ORGANIZATION) {
        throw new ForbiddenException(
          'Organization-level integrations require organization-wide admin access',
        );
      }

      restrictToBranchLevel = true;
      branchIds =
        principal.scopeType === MembershipScopeType.ORGANIZATION_WIDE
          ? undefined
          : principal.branchIds;
    }

    const { items, total } =
      await this.integrationsRepository.listIntegrationConnections({
        organizationId,
        branchId,
        branchIds,
        provider: query.provider,
        status: query.status,
        scopeType: query.scopeType,
        restrictToBranchLevel,
        skip,
        take,
      });

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
