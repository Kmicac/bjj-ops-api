import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IntegrationProvider } from '../../../generated/prisma/enums';
import { IntegrationSecretConfigService } from '../integration-secret-config.service';
import { IntegrationProviderRegistry } from './integration-provider.registry';
import { IntegrationProviderConfigService } from './integration-provider-config.service';

describe('IntegrationProviderConfigService', () => {
  let service: IntegrationProviderConfigService;
  let configService: {
    get: jest.Mock;
  };
  let integrationProviderRegistry: {
    getClient: jest.Mock;
  };
  let integrationSecretConfigService: {
    decryptObject: jest.Mock;
    encryptObject: jest.Mock;
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string | undefined> = {
          MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR-env-access-token-1234567890',
          MERCADO_PAGO_PUBLIC_KEY: 'APP_USR-env-public-key',
          MERCADO_PAGO_APPLICATION_ID: 'env-app-id',
          MERCADO_PAGO_WEBHOOK_SECRET: 'env-webhook-secret',
          MERCADO_PAGO_ENVIRONMENT: 'test',
        };

        return values[key];
      }),
    };

    integrationProviderRegistry = {
      getClient: jest.fn().mockReturnValue({
        validateConfig: jest.fn((config: Record<string, unknown>) => ({
          accessToken: config.accessToken,
          publicKey: config.publicKey,
          applicationId: config.applicationId,
          webhookSecret: config.webhookSecret,
          environment:
            config.environment === 'production' ? 'production' : 'test',
        })),
      }),
    };

    integrationSecretConfigService = {
      decryptObject: jest.fn(),
      encryptObject: jest.fn((value: Record<string, unknown>) => value),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationProviderConfigService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: IntegrationProviderRegistry,
          useValue: integrationProviderRegistry,
        },
        {
          provide: IntegrationSecretConfigService,
          useValue: integrationSecretConfigService,
        },
      ],
    }).compile();

    service = module.get<IntegrationProviderConfigService>(
      IntegrationProviderConfigService,
    );
  });

  it('falls back to Mercado Pago credentials from environment when stored config is absent', () => {
    expect(
      service.resolveConfigForProvider(IntegrationProvider.MERCADO_PAGO, null),
    ).toEqual({
      accessToken: 'APP_USR-env-access-token-1234567890',
      publicKey: 'APP_USR-env-public-key',
      applicationId: 'env-app-id',
      webhookSecret: 'env-webhook-secret',
      environment: 'test',
    });
  });

  it('lets stored Mercado Pago config override environment defaults', () => {
    integrationSecretConfigService.decryptObject.mockReturnValue({
      accessToken: 'APP_USR-stored-access-token-1234567890',
      publicKey: 'APP_USR-stored-public-key',
      applicationId: 'stored-app-id',
      webhookSecret: 'stored-webhook-secret',
      environment: 'production',
    });

    expect(
      service.resolveConfigForProvider(IntegrationProvider.MERCADO_PAGO, {
        kind: 'encrypted',
      }),
    ).toEqual({
      accessToken: 'APP_USR-stored-access-token-1234567890',
      publicKey: 'APP_USR-stored-public-key',
      applicationId: 'stored-app-id',
      webhookSecret: 'stored-webhook-secret',
      environment: 'production',
    });
  });
});
