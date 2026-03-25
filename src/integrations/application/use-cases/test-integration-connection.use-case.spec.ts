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
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { IntegrationProviderRegistry } from '../provider-clients/integration-provider.registry';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { TestIntegrationConnectionUseCase } from './test-integration-connection.use-case';

describe('TestIntegrationConnectionUseCase', () => {
  let useCase: TestIntegrationConnectionUseCase;
  let integrationsPolicy: {
    ensureCanManageConnection: jest.Mock;
  };
  let integrationsRepository: {
    getIntegrationConnectionManagementTarget: jest.Mock;
    createCompletedSyncJob: jest.Mock;
  };
  let integrationProviderRegistry: {
    getClient: jest.Mock;
  };
  let integrationProviderConfigService: {
    resolveConfigForProvider: jest.Mock;
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
    };

    integrationsRepository = {
      getIntegrationConnectionManagementTarget: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        branchId: null,
        provider: IntegrationProvider.MERCADO_PAGO,
        scopeType: IntegrationScopeType.ORGANIZATION,
        configJson: {
          kind: 'encrypted',
        },
        branch: null,
      }),
      createCompletedSyncJob: jest.fn().mockResolvedValue({
        id: 'job_1',
        organizationId: 'org_1',
        branchId: null,
        integrationConnectionId: 'integration_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        syncKind: IntegrationSyncKind.TEST_CONNECTION,
        status: IntegrationSyncStatus.SUCCEEDED,
        startedAt: new Date(),
        finishedAt: new Date(),
        triggeredByMembershipId: 'membership_1',
        summaryJson: {
          provider: 'MERCADO_PAGO',
        },
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    integrationProviderRegistry = {
      getClient: jest.fn().mockReturnValue({
        testConnection: jest.fn().mockResolvedValue({
          status: IntegrationSyncStatus.SUCCEEDED,
          summaryJson: {
            provider: 'MERCADO_PAGO',
            environment: 'test',
          },
        }),
      }),
    };

    integrationProviderConfigService = {
      resolveConfigForProvider: jest.fn().mockReturnValue({
        accessToken: 'APP_USR-12345678901234567890',
        environment: 'test',
      }),
    };

    auditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestIntegrationConnectionUseCase,
        {
          provide: IntegrationsPolicy,
          useValue: integrationsPolicy,
        },
        {
          provide: IntegrationsRepository,
          useValue: integrationsRepository,
        },
        {
          provide: IntegrationProviderRegistry,
          useValue: integrationProviderRegistry,
        },
        {
          provide: IntegrationProviderConfigService,
          useValue: integrationProviderConfigService,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    useCase = module.get<TestIntegrationConnectionUseCase>(
      TestIntegrationConnectionUseCase,
    );
  });

  it('uses the provider client for Mercado Pago test connection and audits the result', async () => {
    const result = await useCase.execute(principal, 'org_1', 'integration_1');

    expect(
      integrationProviderConfigService.resolveConfigForProvider,
    ).toHaveBeenCalledWith(IntegrationProvider.MERCADO_PAGO, {
      kind: 'encrypted',
    });
    expect(integrationsRepository.createCompletedSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        integrationConnectionId: 'integration_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        syncKind: IntegrationSyncKind.TEST_CONNECTION,
        status: IntegrationSyncStatus.SUCCEEDED,
      }),
    );
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'integration_sync_job.test_triggered',
        entityType: 'IntegrationSyncJob',
        entityId: 'job_1',
      }),
    );
    expect(result.id).toBe('job_1');
  });
});
