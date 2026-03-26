import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { MembershipScopeType } from '../../../generated/prisma/enums';
import { IntegrationWebhookEventsPolicy } from '../../domain/integration-webhook-events.policy';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { GetIntegrationWebhookEventUseCase } from './get-integration-webhook-event.use-case';

describe('GetIntegrationWebhookEventUseCase', () => {
  let useCase: GetIntegrationWebhookEventUseCase;
  let integrationsPolicy: {
    ensureCanManageConnection: jest.Mock;
  };
  let integrationsRepository: {
    getIntegrationConnectionManagementTarget: jest.Mock;
    getWebhookEventById: jest.Mock;
  };
  let integrationWebhookEventsPolicy: {
    buildDetail: jest.Mock;
  };
  let principal: AuthenticatedPrincipal;

  beforeEach(async () => {
    principal = {
      sub: 'user_1',
      organizationId: 'org_1',
      membershipId: 'membership_1',
      assignedRoles: [],
      scopeType: MembershipScopeType.ORGANIZATION_WIDE,
      branchIds: [],
    } as AuthenticatedPrincipal;

    integrationsPolicy = {
      ensureCanManageConnection: jest.fn(),
    };

    integrationsRepository = {
      getIntegrationConnectionManagementTarget: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        provider: 'MERCADO_PAGO',
        scopeType: 'BRANCH',
        branchId: 'branch_1',
        branch: {
          id: 'branch_1',
          organizationId: 'org_1',
          headCoachMembershipId: null,
        },
      }),
      getWebhookEventById: jest.fn().mockResolvedValue({
        id: 'webhook_1',
        organizationId: 'org_1',
        integrationConnectionId: 'integration_1',
      }),
    };

    integrationWebhookEventsPolicy = {
      buildDetail: jest.fn().mockReturnValue({
        id: 'webhook_1',
        requestId: 'req_1',
        payload: {
          dataId: 'payment_123',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetIntegrationWebhookEventUseCase,
        {
          provide: IntegrationsPolicy,
          useValue: integrationsPolicy,
        },
        {
          provide: IntegrationWebhookEventsPolicy,
          useValue: integrationWebhookEventsPolicy,
        },
        {
          provide: IntegrationsRepository,
          useValue: integrationsRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetIntegrationWebhookEventUseCase>(
      GetIntegrationWebhookEventUseCase,
    );
  });

  it('returns a sanitized webhook event detail scoped to the integration', async () => {
    const result = await useCase.execute(
      principal,
      'org_1',
      'integration_1',
      'webhook_1',
    );

    expect(result).toEqual({
      id: 'webhook_1',
      requestId: 'req_1',
      payload: {
        dataId: 'payment_123',
      },
    });
    expect(integrationWebhookEventsPolicy.buildDetail).toHaveBeenCalledTimes(1);
  });

  it('rejects webhook detail access outside the current integration scope', async () => {
    integrationsRepository.getWebhookEventById.mockResolvedValueOnce({
      id: 'webhook_1',
      organizationId: 'org_1',
      integrationConnectionId: 'integration_other',
    });

    await expect(
      useCase.execute(principal, 'org_1', 'integration_1', 'webhook_1'),
    ).rejects.toThrow(NotFoundException);
  });
});
