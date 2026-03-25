import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { IntegrationSyncStatus } from '../../../generated/prisma/enums';
import { TriggerIntegrationSyncDto } from '../../dto/trigger-integration-sync.dto';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class TriggerIntegrationSyncUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    integrationId: string,
    dto: TriggerIntegrationSyncDto,
  ) {
    const connection =
      await this.integrationsRepository.getIntegrationConnectionManagementTarget(
        organizationId,
        integrationId,
      );
    this.integrationsPolicy.ensureCanManageConnection(principal, connection);
    this.integrationsPolicy.ensureSyncKindAllowed(dto.syncKind);

    const startedAt = new Date();
    const finishedAt = new Date(startedAt);
    const job = await this.integrationsRepository.createCompletedSyncJob({
      organizationId,
      branchId: connection.branchId,
      integrationConnectionId: connection.id,
      provider: connection.provider,
      syncKind: dto.syncKind,
      status: IntegrationSyncStatus.SUCCEEDED,
      startedAt,
      finishedAt,
      triggeredByMembershipId: principal.membershipId,
      summaryJson: {
        mode: 'placeholder',
        message:
          'Sync job created without external provider execution in this iteration.',
      },
    });

    await this.auditService.create({
      organizationId,
      branchId: connection.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'integration_sync_job.triggered',
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
}
