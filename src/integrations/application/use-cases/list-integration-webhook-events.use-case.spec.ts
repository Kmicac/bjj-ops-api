import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { MembershipScopeType } from '../../../generated/prisma/enums';
import { ListIntegrationWebhookEventsQueryDto } from '../../dto/list-integration-webhook-events.query.dto';
import { IntegrationWebhookEventsPolicy } from '../../domain/integration-webhook-events.policy';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { ListIntegrationWebhookEventsUseCase } from './list-integration-webhook-events.use-case';

describe('ListIntegrationWebhookEventsUseCase', () => {
  let useCase: ListIntegrationWebhookEventsUseCase;
  let integrationsPolicy: {
    ensureCanManageConnection: jest.Mock;
  };
  let integrationsRepository: {
    getIntegrationConnectionManagementTarget: jest.Mock;
    listWebhookEvents: jest.Mock;
  };
  let integrationWebhookEventsPolicy: {
    getRecoverableIgnoredReasons: jest.Mock;
    buildListItem: jest.Mock;
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
      listWebhookEvents: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'webhook_1',
          },
        ],
        total: 1,
      }),
    };

    integrationWebhookEventsPolicy = {
      getRecoverableIgnoredReasons: jest
        .fn()
        .mockReturnValue(['charge_not_found']),
      buildListItem: jest.fn().mockReturnValue({
        id: 'webhook_1',
        isRecoverable: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListIntegrationWebhookEventsUseCase,
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

    useCase = module.get<ListIntegrationWebhookEventsUseCase>(
      ListIntegrationWebhookEventsUseCase,
    );
  });

  it('lists webhook events scoped to the integration with operational filters', async () => {
    const query: ListIntegrationWebhookEventsQueryDto = {
      page: 1,
      limit: 20,
      processingStatus: 'FAILED' as never,
      notificationType: 'payment',
      onlyRecoverable: true,
      externalResourceId: 'payment_123',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    };

    const result = await useCase.execute(
      principal,
      'org_1',
      'integration_1',
      query,
    );

    expect(integrationsRepository.listWebhookEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        integrationConnectionId: 'integration_1',
        processingStatus: 'FAILED',
        notificationType: 'payment',
        externalResourceId: 'payment_123',
        onlyRecoverable: true,
        recoverableIgnoredReasons: ['charge_not_found'],
      }),
    );
    expect(result).toEqual({
      items: [
        {
          id: 'webhook_1',
          isRecoverable: true,
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
      },
    });
  });
});
