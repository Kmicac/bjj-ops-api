import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
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
import { CreateIntegrationConnectionUseCase } from './create-integration-connection.use-case';

describe('CreateIntegrationConnectionUseCase', () => {
  let useCase: CreateIntegrationConnectionUseCase;
  let integrationsPolicy: {
    ensureValidScopeAssignment: jest.Mock;
    ensureCanManageOrganizationConnections: jest.Mock;
    ensureCanManageBranchConnections: jest.Mock;
    normalizeDisplayName: jest.Mock;
  };
  let integrationsRepository: {
    getBranchAccessTarget: jest.Mock;
    createIntegrationConnection: jest.Mock;
  };
  let integrationProviderConfigService: {
    prepareConfigForStorage: jest.Mock;
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
    assignedRoles: [MembershipRole.ACADEMY_MANAGER],
    scopeType: MembershipScopeType.SELECTED_BRANCHES,
    branchIds: ['branch_1'],
    primaryBranchId: 'branch_1',
  };

  beforeEach(async () => {
    integrationsPolicy = {
      ensureValidScopeAssignment: jest.fn(),
      ensureCanManageOrganizationConnections: jest.fn(),
      ensureCanManageBranchConnections: jest.fn(),
      normalizeDisplayName: jest.fn().mockReturnValue('Mercado Pago Branch'),
    };

    integrationsRepository = {
      getBranchAccessTarget: jest.fn().mockResolvedValue({
        id: 'branch_1',
        organizationId: 'org_1',
        headCoachMembershipId: null,
      }),
      createIntegrationConnection: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        status: IntegrationStatus.INACTIVE,
        scopeType: IntegrationScopeType.BRANCH,
        displayName: 'Mercado Pago Branch',
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
    };

    auditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateIntegrationConnectionUseCase,
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

    useCase = module.get<CreateIntegrationConnectionUseCase>(
      CreateIntegrationConnectionUseCase,
    );
  });

  it('creates a branch-scoped integration connection and audits the write', async () => {
    const result = await useCase.execute(principal, 'org_1', {
      provider: IntegrationProvider.MERCADO_PAGO,
      scopeType: IntegrationScopeType.BRANCH,
      branchId: 'branch_1',
      displayName: ' Mercado Pago Branch ',
      status: undefined,
      configJson: {
        sandbox: true,
      },
    });

    expect(integrationsRepository.getBranchAccessTarget).toHaveBeenCalledWith(
      'org_1',
      'branch_1',
    );
    expect(
      integrationsPolicy.ensureCanManageBranchConnections,
    ).toHaveBeenCalled();
    expect(integrationsRepository.createIntegrationConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        branchId: 'branch_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        status: IntegrationStatus.INACTIVE,
        scopeType: IntegrationScopeType.BRANCH,
        displayName: 'Mercado Pago Branch',
        createdByMembershipId: 'membership_1',
      }),
    );
    expect(
      integrationProviderConfigService.prepareConfigForStorage,
    ).toHaveBeenCalledWith(IntegrationProvider.MERCADO_PAGO, {
      sandbox: true,
    });
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        branchId: 'branch_1',
        action: 'integration_connection.created',
        entityType: 'IntegrationConnection',
        entityId: 'integration_1',
      }),
    );
    expect(result.id).toBe('integration_1');
  });
});
