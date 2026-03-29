import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExternalEntityType, IntegrationProvider } from '../../../generated/prisma/enums';
import { MercadoPagoCheckoutConfigService } from '../mercado-pago-checkout-config.service';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import { MercadoPagoProviderClient } from '../../infrastructure/provider-clients/mercado-pago-provider.client';
import { CreateMercadoPagoBillingPreferenceUseCase } from './create-mercado-pago-billing-preference.use-case';

describe('CreateMercadoPagoBillingPreferenceUseCase', () => {
  let useCase: CreateMercadoPagoBillingPreferenceUseCase;
  let integrationsRepository: {
    getSingleActiveBranchConnectionByProvider: jest.Mock;
    findSingleExternalEntityLinkByInternalEntity: jest.Mock;
    createExternalEntityLink: jest.Mock;
  };
  let integrationProviderConfigService: {
    resolveConfigForProvider: jest.Mock;
  };
  let mercadoPagoCheckoutConfigService: {
    getPreferenceConfig: jest.Mock;
  };
  let mercadoPagoProviderClient: {
    createCheckoutProPreference: jest.Mock;
  };

  beforeEach(async () => {
    integrationsRepository = {
      getSingleActiveBranchConnectionByProvider: jest.fn().mockResolvedValue({
        id: 'integration_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        configJson: {
          kind: 'encrypted',
        },
      }),
      findSingleExternalEntityLinkByInternalEntity: jest.fn().mockResolvedValue(null),
      createExternalEntityLink: jest.fn().mockResolvedValue({
        id: 'link_1',
      }),
    };

    integrationProviderConfigService = {
      resolveConfigForProvider: jest.fn().mockReturnValue({
        accessToken: 'APP_USR-12345678901234567890',
        publicKey: 'APP_USR-123456-public',
        environment: 'test',
      }),
    };

    mercadoPagoCheckoutConfigService = {
      getPreferenceConfig: jest.fn().mockReturnValue({
        backUrls: {
          success: 'http://localhost:3001/payments/success',
          failure: 'http://localhost:3001/payments/failure',
          pending: 'http://localhost:3001/payments/pending',
        },
        autoReturn: 'approved',
        notificationUrl:
          'https://payments.example.com/api/v1/integrations/webhooks/mercado-pago',
      }),
    };

    mercadoPagoProviderClient = {
      createCheckoutProPreference: jest.fn().mockResolvedValue({
        preferenceId: 'pref_123',
        initPoint: 'https://www.mercadopago.com/init/pref_123',
        sandboxInitPoint: 'https://sandbox.mercadopago.com/init/pref_123',
        environment: 'test',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateMercadoPagoBillingPreferenceUseCase,
        {
          provide: IntegrationsRepository,
          useValue: integrationsRepository,
        },
        {
          provide: IntegrationProviderConfigService,
          useValue: integrationProviderConfigService,
        },
        {
          provide: MercadoPagoCheckoutConfigService,
          useValue: mercadoPagoCheckoutConfigService,
        },
        {
          provide: MercadoPagoProviderClient,
          useValue: mercadoPagoProviderClient,
        },
      ],
    }).compile();

    useCase = module.get<CreateMercadoPagoBillingPreferenceUseCase>(
      CreateMercadoPagoBillingPreferenceUseCase,
    );
  });

  it('creates a Mercado Pago preference and stores an external entity link', async () => {
    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      billingChargeId: 'charge_1',
      title: 'BJJ Ops billing charge',
      amount: 100,
      currency: 'ARS',
      externalReference: 'billing_charge:charge_1',
      createdByMembershipId: 'membership_1',
      payer: undefined,
    });

    expect(
      integrationsRepository.getSingleActiveBranchConnectionByProvider,
    ).toHaveBeenCalledWith(
      'org_1',
      'branch_1',
      IntegrationProvider.MERCADO_PAGO,
    );
    expect(
      mercadoPagoProviderClient.createCheckoutProPreference,
    ).toHaveBeenCalledWith(
      {
        accessToken: 'APP_USR-12345678901234567890',
        publicKey: 'APP_USR-123456-public',
        environment: 'test',
      },
      expect.objectContaining({
        itemId: 'charge_1',
        externalReference: 'billing_charge:charge_1',
        amount: 100,
        currency: 'ARS',
        categoryId: 'services',
        backUrls: {
          success: 'http://localhost:3001/payments/success',
          failure: 'http://localhost:3001/payments/failure',
          pending: 'http://localhost:3001/payments/pending',
        },
        autoReturn: 'approved',
        notificationUrl:
          'https://payments.example.com/api/v1/integrations/webhooks/mercado-pago',
      }),
    );
    expect(integrationsRepository.createExternalEntityLink).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationConnectionId: 'integration_1',
        provider: IntegrationProvider.MERCADO_PAGO,
        entityType: ExternalEntityType.BILLING_CHARGE,
        internalEntityId: 'charge_1',
        externalEntityId: 'pref_123',
        externalReference: 'billing_charge:charge_1',
      }),
    );
    expect(result).toEqual({
      connectionId: 'integration_1',
      environment: 'test',
      publicKey: 'APP_USR-123456-public',
      preferenceId: 'pref_123',
      externalReference: 'billing_charge:charge_1',
      initPoint: 'https://www.mercadopago.com/init/pref_123',
      sandboxInitPoint: 'https://sandbox.mercadopago.com/init/pref_123',
      reused: false,
    });
  });

  it('reuses an existing external entity link when the current balance still matches', async () => {
    integrationsRepository.findSingleExternalEntityLinkByInternalEntity.mockResolvedValue({
      id: 'link_1',
      externalEntityId: 'pref_existing',
      externalReference: 'billing_charge:charge_1',
      metadataJson: {
        kind: 'mercado_pago_checkout_pro_preference',
        environment: 'test',
        initPoint: 'https://www.mercadopago.com/init/pref_existing',
        sandboxInitPoint: 'https://sandbox.mercadopago.com/init/pref_existing',
        amount: '100.00',
        currency: 'ARS',
      },
    });

    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      billingChargeId: 'charge_1',
      billingChargeExternalReference: 'pref_existing',
      title: 'BJJ Ops billing charge',
      amount: 100,
      currency: 'ARS',
      externalReference: 'billing_charge:charge_1',
      createdByMembershipId: 'membership_1',
    });

    expect(mercadoPagoProviderClient.createCheckoutProPreference).not.toHaveBeenCalled();
    expect(integrationsRepository.createExternalEntityLink).not.toHaveBeenCalled();
    expect(result).toEqual({
      connectionId: 'integration_1',
      environment: 'test',
      publicKey: 'APP_USR-123456-public',
      preferenceId: 'pref_existing',
      externalReference: 'billing_charge:charge_1',
      initPoint: 'https://www.mercadopago.com/init/pref_existing',
      sandboxInitPoint: 'https://sandbox.mercadopago.com/init/pref_existing',
      reused: true,
    });
  });

  it('fails when no active branch integration is configured', async () => {
    integrationsRepository.getSingleActiveBranchConnectionByProvider.mockRejectedValue(
      new NotFoundException('Active branch integration connection not found'),
    );

    await expect(
      useCase.execute({
        organizationId: 'org_1',
        branchId: 'branch_1',
        billingChargeId: 'charge_1',
        title: 'BJJ Ops billing charge',
        amount: 100,
        currency: 'ARS',
        externalReference: 'billing_charge:charge_1',
        createdByMembershipId: 'membership_1',
      }),
    ).rejects.toThrow('Active branch integration connection not found');
  });

  it('fails when a charge already has a Mercado Pago reference but no stored link', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org_1',
        branchId: 'branch_1',
        billingChargeId: 'charge_1',
        billingChargeExternalReference: 'pref_missing_link',
        title: 'BJJ Ops billing charge',
        amount: 100,
        currency: 'ARS',
        externalReference: 'billing_charge:charge_1',
        createdByMembershipId: 'membership_1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('reuses the existing link when another request wins the create race first', async () => {
    integrationsRepository.createExternalEntityLink.mockRejectedValueOnce(
      new ConflictException('External entity link already exists'),
    );
    integrationsRepository.findSingleExternalEntityLinkByInternalEntity
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'link_race_1',
        externalEntityId: 'pref_race_winner',
        externalReference: 'billing_charge:charge_1',
        metadataJson: {
          kind: 'mercado_pago_checkout_pro_preference',
          environment: 'test',
          initPoint: 'https://www.mercadopago.com/init/pref_race_winner',
          sandboxInitPoint:
            'https://sandbox.mercadopago.com/init/pref_race_winner',
          amount: '100.00',
          currency: 'ARS',
        },
      });

    const result = await useCase.execute({
      organizationId: 'org_1',
      branchId: 'branch_1',
      billingChargeId: 'charge_1',
      title: 'BJJ Ops billing charge',
      amount: 100,
      currency: 'ARS',
      externalReference: 'billing_charge:charge_1',
      createdByMembershipId: 'membership_1',
    });

    expect(mercadoPagoProviderClient.createCheckoutProPreference).toHaveBeenCalled();
    expect(result).toEqual({
      connectionId: 'integration_1',
      environment: 'test',
      publicKey: 'APP_USR-123456-public',
      preferenceId: 'pref_race_winner',
      externalReference: 'billing_charge:charge_1',
      initPoint: 'https://www.mercadopago.com/init/pref_race_winner',
      sandboxInitPoint:
        'https://sandbox.mercadopago.com/init/pref_race_winner',
      reused: true,
    });
  });

  it('fails when Mercado Pago publicKey is unavailable for Checkout Pro frontend', async () => {
    integrationProviderConfigService.resolveConfigForProvider.mockReturnValue({
      accessToken: 'APP_USR-12345678901234567890',
      environment: 'test',
    });

    await expect(
      useCase.execute({
        organizationId: 'org_1',
        branchId: 'branch_1',
        billingChargeId: 'charge_1',
        title: 'BJJ Ops billing charge',
        amount: 100,
        currency: 'ARS',
        externalReference: 'billing_charge:charge_1',
        createdByMembershipId: 'membership_1',
      }),
    ).rejects.toThrow(
      'Mercado Pago publicKey is required to initialize Checkout Pro',
    );
  });
});
