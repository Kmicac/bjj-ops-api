import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import {
  IntegrationProvider,
  IntegrationScopeType,
  IntegrationWebhookProcessingStatus,
  IntegrationWebhookValidationStatus,
  MembershipScopeType,
} from '../../../generated/prisma/enums';
import { IntegrationWebhookEventsPolicy } from '../../domain/integration-webhook-events.policy';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { ProcessMercadoPagoWebhookEventUseCase } from './process-mercado-pago-webhook-event.use-case';
import { ReprocessMercadoPagoWebhookEventUseCase } from './reprocess-mercado-pago-webhook-event.use-case';

describe('ReprocessMercadoPagoWebhookEventUseCase', () => {
  let useCase: ReprocessMercadoPagoWebhookEventUseCase;
  let integrationsPolicy: {
    ensureCanManageConnection: jest.Mock;
  };
  let integrationWebhookEventsPolicy: {
    ensureCanReprocess: jest.Mock;
  };
  let integrationsRepository: {
    getIntegrationConnectionManagementTarget: jest.Mock;
    getWebhookEventById: jest.Mock;
    markWebhookEventReprocessed: jest.Mock;
  };
  let processMercadoPagoWebhookEventUseCase: {
    execute: jest.Mock;
  };
  let auditService: {
    create: jest.Mock;
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

    integrationWebhookEventsPolicy = {
      ensureCanReprocess: jest.fn(),
    };

    integrationsRepository = {
      getIntegrationConnectionManagementTarget: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        scopeType: IntegrationScopeType.BRANCH,
        branch: {
          id: 'branch_1',
          organizationId: 'org_1',
          headCoachMembershipId: null,
        },
      }),
      getWebhookEventById: jest.fn().mockResolvedValue({
        id: 'webhook_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        organizationId: 'org_1',
        integrationConnectionId: 'integration_1',
        processingStatus: IntegrationWebhookProcessingStatus.FAILED,
        validationStatus: IntegrationWebhookValidationStatus.VALID,
      }),
      markWebhookEventReprocessed: jest.fn().mockResolvedValue({
        id: 'webhook_1',
        reprocessCount: 1,
        lastReprocessedAt: new Date('2026-03-26T11:00:00.000Z'),
      }),
    };

    processMercadoPagoWebhookEventUseCase = {
      execute: jest.fn().mockResolvedValue({
        id: 'webhook_1',
        processingStatus: IntegrationWebhookProcessingStatus.PROCESSED,
      }),
    };

    auditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReprocessMercadoPagoWebhookEventUseCase,
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
        {
          provide: ProcessMercadoPagoWebhookEventUseCase,
          useValue: processMercadoPagoWebhookEventUseCase,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    useCase = module.get<ReprocessMercadoPagoWebhookEventUseCase>(
      ReprocessMercadoPagoWebhookEventUseCase,
    );
  });

  it('reprocesses a valid Mercado Pago webhook with force enabled', async () => {
    const result = await useCase.execute(
      principal,
      'org_1',
      'integration_1',
      'webhook_1',
    );

    expect(processMercadoPagoWebhookEventUseCase.execute).toHaveBeenCalledWith(
      'webhook_1',
      {
        force: true,
      },
    );
    expect(integrationsRepository.markWebhookEventReprocessed).toHaveBeenCalledTimes(
      1,
    );
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'integration_webhook_event.reprocessed',
        entityId: 'webhook_1',
      }),
    );
    expect(result.processingStatus).toBe(
      IntegrationWebhookProcessingStatus.PROCESSED,
    );
  });

  it('rejects reprocessing for invalid webhook events', async () => {
    integrationWebhookEventsPolicy.ensureCanReprocess.mockImplementationOnce(() => {
      throw new ConflictException(
        'Integration webhook event is not recoverable and cannot be reprocessed',
      );
    });

    await expect(
      useCase.execute(principal, 'org_1', 'integration_1', 'webhook_1'),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects webhook events outside the current integration scope', async () => {
    integrationsRepository.getWebhookEventById.mockResolvedValueOnce({
      id: 'webhook_1',
      provider: IntegrationProvider.MERCADO_PAGO,
      organizationId: 'org_1',
      integrationConnectionId: 'integration_other',
      processingStatus: IntegrationWebhookProcessingStatus.FAILED,
      validationStatus: IntegrationWebhookValidationStatus.VALID,
    });

    await expect(
      useCase.execute(principal, 'org_1', 'integration_1', 'webhook_1'),
    ).rejects.toThrow(NotFoundException);
  });
});
