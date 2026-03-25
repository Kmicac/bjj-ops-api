import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import {
  IntegrationSyncKind,
  IntegrationSyncStatus,
} from '../../../generated/prisma/enums';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { IntegrationProviderRegistry } from '../provider-clients/integration-provider.registry';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class TestIntegrationConnectionUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly integrationProviderRegistry: IntegrationProviderRegistry,
    private readonly integrationProviderConfigService: IntegrationProviderConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    integrationId: string,
  ) {
    const connection =
      await this.integrationsRepository.getIntegrationConnectionManagementTarget(
        organizationId,
        integrationId,
      );
    this.integrationsPolicy.ensureCanManageConnection(principal, connection);

    const startedAt = new Date();
    const finishedAt = new Date(startedAt);
    const providerClient = this.integrationProviderRegistry.getClient(
      connection.provider,
    );
    const providerResult = providerClient
      ? await this.executeProviderConnectionTest(providerClient, connection)
      : {
          status: IntegrationSyncStatus.SUCCEEDED,
          summaryJson: {
            mode: 'placeholder',
            message:
              'No external provider call was executed in this iteration.',
          },
        };
    const job = await this.integrationsRepository.createCompletedSyncJob({
      organizationId,
      branchId: connection.branchId,
      integrationConnectionId: connection.id,
      provider: connection.provider,
      syncKind: IntegrationSyncKind.TEST_CONNECTION,
      status: providerResult.status,
      startedAt,
      finishedAt,
      triggeredByMembershipId: principal.membershipId,
      summaryJson: providerResult.summaryJson as
        | Prisma.InputJsonObject
        | undefined,
      errorMessage: providerResult.errorMessage,
    });

    await this.auditService.create({
      organizationId,
      branchId: connection.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'integration_sync_job.test_triggered',
      entityType: 'IntegrationSyncJob',
      entityId: job.id,
      metadata: {
        integrationConnectionId: connection.id,
        provider: connection.provider,
        syncKind: job.syncKind,
        status: job.status,
      },
    });

    return job;
  }

  private async executeProviderConnectionTest(
    providerClient: NonNullable<
      ReturnType<IntegrationProviderRegistry['getClient']>
    >,
    connection: Awaited<
      ReturnType<IntegrationsRepository['getIntegrationConnectionManagementTarget']>
    >,
  ) {
    try {
      const providerConfig =
        this.integrationProviderConfigService.resolveConfigForProvider(
          connection.provider,
          connection.configJson,
        );

      if (!providerConfig) {
        return {
          status: IntegrationSyncStatus.FAILED,
          errorMessage:
            'Sensitive credentials are not configured for this integration',
          summaryJson: {
            mode: 'provider',
            provider: connection.provider,
          },
        };
      }

      return providerClient.testConnection(providerConfig);
    } catch (error) {
      return {
        status: IntegrationSyncStatus.FAILED,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Integration provider test failed',
        summaryJson: {
          mode: 'provider',
          provider: connection.provider,
        },
      };
    }
  }
}
