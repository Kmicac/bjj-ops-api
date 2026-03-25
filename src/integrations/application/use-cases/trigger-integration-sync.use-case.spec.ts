import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import {
  IntegrationProvider,
  IntegrationScopeType,
  IntegrationSyncKind,
  IntegrationSyncStatus,
  MembershipRole,
  MembershipScopeType,
} from '../../../generated/prisma/enums';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { TriggerIntegrationSyncUseCase } from './trigger-integration-sync.use-case';

describe('TriggerIntegrationSyncUseCase', () => {
  let useCase: TriggerIntegrationSyncUseCase;
  let integrationsPolicy: {
    ensureCanManageConnection: jest.Mock;
    ensureSyncKindAllowed: jest.Mock;
  };
  let integrationsRepository: {
    getIntegrationConnectionManagementTarget: jest.Mock;
    createCompletedSyncJob: jest.Mock;
  };
  let auditService: {
    create: jest.Mock;
  };

  const principal: AuthenticatedPrincipal = {
    sub: 'user_1',
    email: 'admin@snp.local',
    type: 'access',
    organizationSlug: 'org-snp',
    organizationId: 'org_1',
    membershipId: 'membership_1',
    assignedRoles: [MembershipRole.ORG_ADMIN],
    scopeType: MembershipScopeType.ORGANIZATION_WIDE,
    branchIds: [],
    primaryBranchId: null,
  };

  beforeEach(async () => {
    integrationsPolicy = {
      ensureCanManageConnection: jest.fn(),
      ensureSyncKindAllowed: jest.fn(),
    };

    integrationsRepository = {
      getIntegrationConnectionManagementTarget: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        branchId: null,
        provider: IntegrationProvider.SMOOTHCOMP,
        scopeType: IntegrationScopeType.ORGANIZATION,
        branch: null,
      }),
      createCompletedSyncJob: jest.fn().mockResolvedValue({
        id: 'job_1',
        organizationId: 'org_1',
        branchId: null,
        integrationConnectionId: 'integration_1',
        provider: IntegrationProvider.SMOOTHCOMP,
        syncKind: IntegrationSyncKind.IMPORT_STUDENT_COMPETITIONS,
        status: IntegrationSyncStatus.SUCCEEDED,
        startedAt: new Date(),
        finishedAt: new Date(),
        triggeredByMembershipId: 'membership_1',
        summaryJson: {
          mode: 'placeholder',
        },
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    auditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerIntegrationSyncUseCase,
        {
          provide: IntegrationsPolicy,
          useValue: integrationsPolicy,
        },
        {
          provide: IntegrationsRepository,
          useValue: integrationsRepository,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    useCase = module.get<TriggerIntegrationSyncUseCase>(
      TriggerIntegrationSyncUseCase,
    );
  });

  it('creates a placeholder succeeded sync job and audits the trigger', async () => {
    const result = await useCase.execute(principal, 'org_1', 'integration_1', {
      syncKind: IntegrationSyncKind.IMPORT_STUDENT_COMPETITIONS,
    });

    expect(
      integrationsRepository.getIntegrationConnectionManagementTarget,
    ).toHaveBeenCalledWith('org_1', 'integration_1');
    expect(integrationsPolicy.ensureCanManageConnection).toHaveBeenCalled();
    expect(integrationsPolicy.ensureSyncKindAllowed).toHaveBeenCalledWith(
      IntegrationSyncKind.IMPORT_STUDENT_COMPETITIONS,
    );
    expect(integrationsRepository.createCompletedSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        branchId: null,
        integrationConnectionId: 'integration_1',
        provider: IntegrationProvider.SMOOTHCOMP,
        syncKind: IntegrationSyncKind.IMPORT_STUDENT_COMPETITIONS,
        status: IntegrationSyncStatus.SUCCEEDED,
        triggeredByMembershipId: 'membership_1',
      }),
    );
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        action: 'integration_sync_job.triggered',
        entityType: 'IntegrationSyncJob',
        entityId: 'job_1',
      }),
    );
    expect(result.id).toBe('job_1');
  });
});
