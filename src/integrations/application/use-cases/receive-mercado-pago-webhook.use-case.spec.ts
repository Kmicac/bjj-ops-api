import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationProvider } from '../../../generated/prisma/enums';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { ProcessMercadoPagoWebhookEventUseCase } from './process-mercado-pago-webhook-event.use-case';
import { MercadoPagoWebhookPolicy } from '../../domain/mercado-pago-webhook.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { ReceiveMercadoPagoWebhookUseCase } from './receive-mercado-pago-webhook.use-case';

describe('ReceiveMercadoPagoWebhookUseCase', () => {
  let useCase: ReceiveMercadoPagoWebhookUseCase;
  let integrationsRepository: {
    findWebhookEventByProviderAndDeliveryId: jest.Mock;
    listActiveBranchConnectionsByProvider: jest.Mock;
    createWebhookEvent: jest.Mock;
  };
  let integrationProviderConfigService: {
    resolveConfigForProvider: jest.Mock;
  };
  let mercadoPagoWebhookPolicy: {
    validateSignature: jest.Mock;
  };
  let processMercadoPagoWebhookEventUseCase: {
    execute: jest.Mock;
  };

  beforeEach(async () => {
    integrationsRepository = {
      findWebhookEventByProviderAndDeliveryId: jest.fn().mockResolvedValue(null),
      listActiveBranchConnectionsByProvider: jest.fn().mockResolvedValue([
        {
          id: 'integration_1',
          organizationId: 'org_1',
          branchId: 'branch_1',
          provider: IntegrationProvider.MERCADO_PAGO,
          configJson: {
            kind: 'encrypted',
          },
        },
      ]),
      createWebhookEvent: jest.fn().mockResolvedValue({
        id: 'webhook_1',
        validationStatus: 'VALID',
        processingStatus: 'RECEIVED',
      }),
    };

    integrationProviderConfigService = {
      resolveConfigForProvider: jest.fn().mockReturnValue({
        accessToken: 'APP_USR-12345678901234567890',
        applicationId: 'app_1',
        webhookSecret: 'secret_123',
        environment: 'test',
      }),
    };

    mercadoPagoWebhookPolicy = {
      validateSignature: jest.fn().mockReturnValue({
        connectionId: 'integration_1',
        requestId: 'req_1',
        signatureTimestamp: '1742505638683',
        dataId: 'payment_123',
      }),
    };

    processMercadoPagoWebhookEventUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveMercadoPagoWebhookUseCase,
        {
          provide: IntegrationsRepository,
          useValue: integrationsRepository,
        },
        {
          provide: IntegrationProviderConfigService,
          useValue: integrationProviderConfigService,
        },
        {
          provide: MercadoPagoWebhookPolicy,
          useValue: mercadoPagoWebhookPolicy,
        },
        {
          provide: ProcessMercadoPagoWebhookEventUseCase,
          useValue: processMercadoPagoWebhookEventUseCase,
        },
      ],
    }).compile();

    useCase = module.get<ReceiveMercadoPagoWebhookUseCase>(
      ReceiveMercadoPagoWebhookUseCase,
    );

    jest.spyOn(global, 'setImmediate').mockImplementation((callback: (...args: any[]) => void) => {
      callback();
      return {} as NodeJS.Immediate;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records a valid webhook and schedules async processing', async () => {
    const result = await useCase.execute({
      body: {
        id: 'evt_1',
        type: 'payment',
        action: 'payment.updated',
        application_id: 'app_1',
        data: {
          id: 'payment_123',
        },
      },
      query: {
        'data.id': 'payment_123',
        type: 'payment',
      },
      headers: {
        'x-request-id': 'req_1',
        'x-signature': 'ts=1742505638683,v1=valid',
      },
    });

    expect(mercadoPagoWebhookPolicy.validateSignature).toHaveBeenCalled();
    expect(integrationsRepository.createWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationConnectionId: 'integration_1',
        validationStatus: 'VALID',
        processingStatus: 'RECEIVED',
      }),
    );
    expect(processMercadoPagoWebhookEventUseCase.execute).toHaveBeenCalledWith(
      'webhook_1',
    );
    expect(result).toEqual({
      received: true,
      webhookEventId: 'webhook_1',
      duplicate: false,
    });
  });

  it('rejects an invalid signature and stores the invalid attempt', async () => {
    integrationsRepository.createWebhookEvent.mockResolvedValueOnce({
      id: 'webhook_invalid_1',
      validationStatus: 'INVALID',
      processingStatus: 'IGNORED',
    });
    mercadoPagoWebhookPolicy.validateSignature.mockReturnValue(null);

    await expect(
      useCase.execute({
        body: {
          id: 'evt_1',
          type: 'payment',
          data: {
            id: 'payment_123',
          },
        },
        query: {
          'data.id': 'payment_123',
          type: 'payment',
        },
        headers: {
          'x-request-id': 'req_1',
          'x-signature': 'ts=1742505638683,v1=invalid',
        },
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(integrationsRepository.createWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        validationStatus: 'INVALID',
        processingStatus: 'IGNORED',
      }),
    );
    expect(processMercadoPagoWebhookEventUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns quickly when the delivery was already accepted before', async () => {
    integrationsRepository.findWebhookEventByProviderAndDeliveryId.mockResolvedValue({
      id: 'webhook_existing_1',
      validationStatus: 'VALID',
      processingStatus: 'PROCESSED',
    });

    const result = await useCase.execute({
      body: {
        id: 'evt_1',
        type: 'payment',
        data: {
          id: 'payment_123',
        },
      },
      query: {
        'data.id': 'payment_123',
        type: 'payment',
      },
      headers: {
        'x-request-id': 'req_1',
        'x-signature': 'ts=1742505638683,v1=valid',
      },
    });

    expect(integrationsRepository.createWebhookEvent).not.toHaveBeenCalled();
    expect(result).toEqual({
      received: true,
      webhookEventId: 'webhook_existing_1',
      duplicate: true,
    });
  });
});
