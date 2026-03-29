import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import {
  IntegrationProvider,
  IntegrationScopeType,
  IntegrationStatus,
  MembershipRole,
  MembershipScopeType,
} from '../../../generated/prisma/enums';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { UpdateIntegrationConnectionUseCase } from './update-integration-connection.use-case';

describe('UpdateIntegrationConnectionUseCase', () => {
  let useCase: UpdateIntegrationConnectionUseCase;
  let integrationsPolicy: {
    ensureCanManageConnection: jest.Mock;
    ensureProviderScopeAllowed: jest.Mock;
    normalizeDisplayName: jest.Mock;
  };
  let integrationsRepository: {
    getIntegrationConnectionManagementTarget: jest.Mock;
    hasAnotherActiveBranchConnection: jest.Mock;
    updateIntegrationConnection: jest.Mock;
  };
  let integrationProviderConfigService: {
    prepareConfigForStorage: jest.Mock;
    ensureConfigReadyForActivation: jest.Mock;
  };
  let auditService: {
    create: jest.Mock;
  };

  const principal: AuthenticatedPrincipal = {
    sub: 'user_1',
    email: 'manager@branch.local',
    type: 'access',
    organizationSlug: 'org-1',
    organizationId: 'org_1',
    membershipId: 'membership_1',
    assignedRoles: [MembershipRole.ACADEMY_MANAGER],
    scopeType: MembershipScopeType.SELECTED_BRANCHES,
    branchIds: ['branch_1'],
    primaryBranchId: 'branch_1',
  };

  beforeEach(async () => {
    integrationsPolicy = {
      ensureCanManageConnection: jest.fn(),
      ensureProviderScopeAllowed: jest.fn(),
      normalizeDisplayName: jest.fn().mockReturnValue(
        'Mercado Pago Branch Updated',
      ),
    };

    integrationsRepository = {
      getIntegrationConnectionManagementTarget: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        scopeType: IntegrationScopeType.BRANCH,
        status: IntegrationStatus.INACTIVE,
        configJson: {
          kind: 'encrypted',
        },
        branch: {
          id: 'branch_1',
          organizationId: 'org_1',
          headCoachMembershipId: null,
        },
      }),
      hasAnotherActiveBranchConnection: jest.fn().mockResolvedValue(false),
      updateIntegrationConnection: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        scopeType: IntegrationScopeType.BRANCH,
        status: IntegrationStatus.ACTIVE,
        displayName: 'Mercado Pago Branch Updated',
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        createdByMembershipId: 'membership_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    integrationProviderConfigService = {
      prepareConfigForStorage: jest.fn().mockReturnValue({
        kind: 'encrypted',
      }),
      ensureConfigReadyForActivation: jest.fn().mockReturnValue({
        accessToken: 'APP_USR-12345678901234567890',
        applicationId: 'app_1',
        webhookSecret: 'secret_1',
        environment: 'test',
      }),
    };

    auditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateIntegrationConnectionUseCase,
        {
          provide: IntegrationsPolicy,
          useValue: integrationsPolicy,
        },
        {
          provide: IntegrationsRepository,
          useValue: integrationsRepository,
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

    useCase = module.get<UpdateIntegrationConnectionUseCase>(
      UpdateIntegrationConnectionUseCase,
    );
  });

  it('validates activation readiness and branch/provider uniqueness before activating', async () => {
    const result = await useCase.execute(principal, 'org_1', 'integration_1', {
      status: IntegrationStatus.ACTIVE,
    });

    expect(integrationsPolicy.ensureProviderScopeAllowed).toHaveBeenCalledWith(
      IntegrationProvider.MERCADO_PAGO,
      IntegrationScopeType.BRANCH,
    );
    expect(
      integrationProviderConfigService.ensureConfigReadyForActivation,
    ).toHaveBeenCalledWith(IntegrationProvider.MERCADO_PAGO, {
      kind: 'encrypted',
    });
    expect(
      integrationsRepository.hasAnotherActiveBranchConnection,
    ).toHaveBeenCalledWith({
      organizationId: 'org_1',
      branchId: 'branch_1',
      provider: IntegrationProvider.MERCADO_PAGO,
      excludeIntegrationId: 'integration_1',
    });
    expect(integrationsRepository.updateIntegrationConnection).toHaveBeenCalled();
    expect(result.status).toBe(IntegrationStatus.ACTIVE);
  });

  it('rejects activation when another active branch connection already exists for the provider', async () => {
    integrationsRepository.hasAnotherActiveBranchConnection.mockResolvedValueOnce(
      true,
    );

    await expect(
      useCase.execute(principal, 'org_1', 'integration_1', {
        status: IntegrationStatus.ACTIVE,
      }),
    ).rejects.toThrow(ConflictException);

    expect(integrationsRepository.updateIntegrationConnection).not.toHaveBeenCalled();
  });
});
