import { ConflictException, Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import {
  IntegrationScopeType,
  IntegrationStatus,
} from '../../../generated/prisma/enums';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { UpdateIntegrationConnectionDto } from '../../dto/update-integration-connection.dto';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class UpdateIntegrationConnectionUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly integrationProviderConfigService: IntegrationProviderConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    integrationId: string,
    dto: UpdateIntegrationConnectionDto,
  ) {
    const connection =
      await this.integrationsRepository.getIntegrationConnectionManagementTarget(
        organizationId,
        integrationId,
      );
    this.integrationsPolicy.ensureCanManageConnection(principal, connection);

    const hasConfigJsonUpdate = Object.prototype.hasOwnProperty.call(
      dto,
      'configJson',
    );
    const preparedConfig =
      dto.configJson === undefined
        ? undefined
        : this.integrationProviderConfigService.prepareConfigForStorage(
            connection.provider,
            dto.configJson,
          );
    const nextStatus = dto.status ?? connection.status;
    const nextConfig = hasConfigJsonUpdate ? preparedConfig : connection.configJson;

    if (nextStatus === IntegrationStatus.ACTIVE) {
      this.integrationsPolicy.ensureProviderScopeAllowed(
        connection.provider,
        connection.scopeType,
      );
      this.integrationProviderConfigService.ensureConfigReadyForActivation(
        connection.provider,
        nextConfig,
      );

      if (
        connection.scopeType === IntegrationScopeType.BRANCH &&
        connection.branchId &&
        (await this.integrationsRepository.hasAnotherActiveBranchConnection({
          organizationId,
          branchId: connection.branchId,
          provider: connection.provider,
          excludeIntegrationId: connection.id,
        }))
      ) {
        throw new ConflictException(
          'Only one active branch integration connection is allowed per provider',
        );
      }
    }

    const updatedConnection =
      await this.integrationsRepository.updateIntegrationConnection({
        integrationId,
        displayName:
          dto.displayName === undefined
            ? undefined
            : this.integrationsPolicy.normalizeDisplayName(dto.displayName),
        status: dto.status,
        configJson: preparedConfig,
        hasConfigJsonUpdate,
      });

    const updatedFields = [
      ...(dto.displayName !== undefined ? ['displayName'] : []),
      ...(dto.status !== undefined ? ['status'] : []),
      ...(hasConfigJsonUpdate ? ['configJson'] : []),
    ];

    await this.auditService.create({
      organizationId,
      branchId: updatedConnection.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'integration_connection.updated',
      entityType: 'IntegrationConnection',
      entityId: updatedConnection.id,
      metadata: {
        provider: updatedConnection.provider,
        scopeType: updatedConnection.scopeType,
        updatedFields,
      },
    });

    return updatedConnection;
  }
}
