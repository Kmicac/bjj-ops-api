import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import {
  IntegrationScopeType,
  IntegrationStatus,
} from '../../../generated/prisma/enums';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { CreateIntegrationConnectionDto } from '../../dto/create-integration-connection.dto';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class CreateIntegrationConnectionUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly integrationProviderConfigService: IntegrationProviderConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    dto: CreateIntegrationConnectionDto,
  ) {
    this.integrationsPolicy.ensureValidScopeAssignment(
      dto.scopeType,
      dto.branchId,
    );

    let branchId: string | null = null;

    if (dto.scopeType === IntegrationScopeType.ORGANIZATION) {
      this.integrationsPolicy.ensureCanManageOrganizationConnections(
        principal,
        organizationId,
      );
    } else {
      const branch = await this.integrationsRepository.getBranchAccessTarget(
        organizationId,
        dto.branchId!,
      );
      this.integrationsPolicy.ensureCanManageBranchConnections(
        principal,
        organizationId,
        branch,
      );
      branchId = branch.id;
    }

    const connection = await this.integrationsRepository.createIntegrationConnection(
      {
        organizationId,
        branchId,
        provider: dto.provider,
        status: dto.status ?? IntegrationStatus.INACTIVE,
        scopeType: dto.scopeType,
        displayName: this.integrationsPolicy.normalizeDisplayName(
          dto.displayName,
        ),
        configJson: this.integrationProviderConfigService.prepareConfigForStorage(
          dto.provider,
          dto.configJson,
        ),
        createdByMembershipId: principal.membershipId,
      },
    );

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'integration_connection.created',
      entityType: 'IntegrationConnection',
      entityId: connection.id,
      metadata: {
        provider: connection.provider,
        status: connection.status,
        scopeType: connection.scopeType,
      },
    });

    return connection;
  }
}
