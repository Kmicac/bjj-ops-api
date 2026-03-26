import { Test, TestingModule } from '@nestjs/testing';
import { ObserveMercadoPagoPaymentWebhookUseCase } from '../../../billing/application/use-cases/observe-mercado-pago-payment-webhook.use-case';
import {
  IntegrationProvider,
  IntegrationScopeType,
} from '../../../generated/prisma/enums';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { MercadoPagoProviderClient } from '../../infrastructure/provider-clients/mercado-pago-provider.client';
import { ProcessMercadoPagoWebhookEventUseCase } from './process-mercado-pago-webhook-event.use-case';

describe('ProcessMercadoPagoWebhookEventUseCase', () => {
  let useCase: ProcessMercadoPagoWebhookEventUseCase;
  let integrationsRepository: {
    getWebhookEventById: jest.Mock;
    updateWebhookEvent: jest.Mock;
    getIntegrationConnectionManagementTarget: jest.Mock;
  };
  let integrationProviderConfigService: {
    resolveConfigForProvider: jest.Mock;
  };
  let mercadoPagoProviderClient: {
    getPaymentById: jest.Mock;
  };
  let observeMercadoPagoPaymentWebhookUseCase: {
    execute: jest.Mock;
  };

  beforeEach(async () => {
    integrationsRepository = {
      getWebhookEventById: jest.fn().mockResolvedValue({
        id: 'webhook_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        organizationId: 'org_1',
        branchId: 'branch_1',
        integrationConnectionId: 'integration_1',
        notificationType: 'payment',
        externalResourceId: 'payment_123',
        validationStatus: 'VALID',
        processingStatus: 'RECEIVED',
      }),
      updateWebhookEvent: jest.fn().mockResolvedValue({
        id: 'webhook_1',
      }),
      getIntegrationConnectionManagementTarget: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        scopeType: IntegrationScopeType.BRANCH,
        configJson: {
          kind: 'encrypted',
        },
      }),
    };

    integrationProviderConfigService = {
      resolveConfigForProvider: jest.fn().mockReturnValue({
        accessToken: 'APP_USR-12345678901234567890',
        webhookSecret: 'secret_123',
        environment: 'test',
      }),
    };

    mercadoPagoProviderClient = {
      getPaymentById: jest.fn().mockResolvedValue({
        id: 'payment_123',
        externalReference: 'billing_charge:charge_1',
        status: 'approved',
        statusDetail: 'accredited',
        transactionAmount: 100,
        currency: 'ARS',
      }),
    };

    observeMercadoPagoPaymentWebhookUseCase = {
      execute: jest.fn().mockResolvedValue({
        outcome: 'updated',
        chargeId: 'charge_1',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessMercadoPagoWebhookEventUseCase,
        {
          provide: IntegrationsRepository,
          useValue: integrationsRepository,
        },
        {
          provide: IntegrationProviderConfigService,
          useValue: integrationProviderConfigService,
        },
        {
          provide: MercadoPagoProviderClient,
          useValue: mercadoPagoProviderClient,
        },
        {
          provide: ObserveMercadoPagoPaymentWebhookUseCase,
          useValue: observeMercadoPagoPaymentWebhookUseCase,
        },
      ],
    }).compile();

    useCase = module.get<ProcessMercadoPagoWebhookEventUseCase>(
      ProcessMercadoPagoWebhookEventUseCase,
    );
  });

  it('fetches the payment resource and delegates the business impact to billing', async () => {
    await useCase.execute('webhook_1');

    expect(mercadoPagoProviderClient.getPaymentById).toHaveBeenCalledWith(
      {
        accessToken: 'APP_USR-12345678901234567890',
        webhookSecret: 'secret_123',
        environment: 'test',
      },
      'payment_123',
    );
    expect(observeMercadoPagoPaymentWebhookUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        branchId: 'branch_1',
        paymentId: 'payment_123',
        externalReference: 'billing_charge:charge_1',
        transactionAmount: 100,
        currency: 'ARS',
      }),
    );
    expect(integrationsRepository.updateWebhookEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventId: 'webhook_1',
        processingStatus: 'PROCESSED',
      }),
    );
  });

  it('marks the event as ignored when billing says the notification is outside scope', async () => {
    observeMercadoPagoPaymentWebhookUseCase.execute.mockResolvedValue({
      outcome: 'ignored',
      reason: 'charge_outside_branch_scope',
    });

    await useCase.execute('webhook_1');

    expect(integrationsRepository.updateWebhookEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventId: 'webhook_1',
        processingStatus: 'IGNORED',
        processingError: 'charge_outside_branch_scope',
      }),
    );
  });

  it('fails safely when the provider fetch cannot be completed', async () => {
    mercadoPagoProviderClient.getPaymentById.mockRejectedValue(
      new Error('Mercado Pago payment resource was not found'),
    );

    await useCase.execute('webhook_1');

    expect(observeMercadoPagoPaymentWebhookUseCase.execute).not.toHaveBeenCalled();
    expect(integrationsRepository.updateWebhookEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventId: 'webhook_1',
        processingStatus: 'FAILED',
        processingError: 'Mercado Pago payment resource was not found',
      }),
    );
  });

  it('reprocesses a previously ignored valid event when force is enabled', async () => {
    integrationsRepository.getWebhookEventById.mockResolvedValueOnce({
      id: 'webhook_1',
      provider: IntegrationProvider.MERCADO_PAGO,
      organizationId: 'org_1',
      branchId: 'branch_1',
      integrationConnectionId: 'integration_1',
      notificationType: 'payment',
      externalResourceId: 'payment_123',
      validationStatus: 'VALID',
      processingStatus: 'IGNORED',
    });

    await useCase.execute('webhook_1', {
      force: true,
    });

    expect(mercadoPagoProviderClient.getPaymentById).toHaveBeenCalledTimes(1);
    expect(observeMercadoPagoPaymentWebhookUseCase.execute).toHaveBeenCalledTimes(
      1,
    );
  });
});
