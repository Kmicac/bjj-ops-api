import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../generated/prisma/client';
import { IntegrationProvider } from '../../../generated/prisma/enums';
import { IntegrationSecretConfigService } from '../integration-secret-config.service';
import { IntegrationProviderRegistry } from './integration-provider.registry';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readTrimmedOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

@Injectable()
export class IntegrationProviderConfigService {
  constructor(
    private readonly configService: ConfigService,
    private readonly integrationProviderRegistry: IntegrationProviderRegistry,
    private readonly integrationSecretConfigService: IntegrationSecretConfigService,
  ) {}

  prepareConfigForStorage(
    provider: IntegrationProvider,
    rawConfig: Record<string, unknown> | null | undefined,
  ) {
    if (rawConfig === undefined) {
      return undefined;
    }

    if (rawConfig === null) {
      return null;
    }

    const providerClient = this.integrationProviderRegistry.getClient(provider);

    if (!providerClient) {
      return rawConfig as Prisma.InputJsonObject;
    }

    const validatedConfig = this.validateProviderConfig(provider, rawConfig);
    return this.integrationSecretConfigService.encryptObject(validatedConfig);
  }

  resolveConfigForProvider(
    provider: IntegrationProvider,
    storedConfig:
      | Prisma.JsonValue
      | Prisma.InputJsonValue
      | null
      | undefined,
  ): Record<string, unknown> | null {
    const providerClient = this.integrationProviderRegistry.getClient(provider);

    if (!providerClient) {
      if (storedConfig === undefined || storedConfig === null) {
        return null;
      }

      if (!isPlainObject(storedConfig)) {
        throw new ConflictException('Stored integration configuration is invalid');
      }

      return storedConfig;
    }

    const decryptedConfig =
      storedConfig === undefined || storedConfig === null
        ? null
        : this.integrationSecretConfigService.decryptObject(storedConfig);
    const mergedConfig = this.mergeProviderEnvironmentDefaults(
      provider,
      decryptedConfig,
    );

    if (!mergedConfig) {
      return null;
    }

    return this.validateProviderConfig(provider, mergedConfig);
  }

  ensureConfigReadyForActivation(
    provider: IntegrationProvider,
    storedConfig: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  ) {
    const resolvedConfig = this.resolveConfigForProvider(provider, storedConfig);

    if (!resolvedConfig) {
      throw new ConflictException(
        'Active integrations require configured credentials',
      );
    }

    if (provider === IntegrationProvider.MERCADO_PAGO) {
      const applicationId = readTrimmedOptionalString(
        resolvedConfig.applicationId,
      );
      const webhookSecret = readTrimmedOptionalString(
        resolvedConfig.webhookSecret,
      );

      if (!applicationId) {
        throw new ConflictException(
          'Active Mercado Pago integrations require applicationId',
        );
      }

      if (!webhookSecret) {
        throw new ConflictException(
          'Active Mercado Pago integrations require webhookSecret',
        );
      }
    }

    return resolvedConfig;
  }

  private validateProviderConfig(
    provider: IntegrationProvider,
    rawConfig: Record<string, unknown>,
  ) {
    const providerClient = this.integrationProviderRegistry.getClient(provider);

    if (!providerClient) {
      return rawConfig;
    }

    try {
      return providerClient.validateConfig(rawConfig);
    } catch (error) {
      throw new ConflictException(
        error instanceof Error
          ? error.message
          : 'Invalid integration provider configuration',
      );
    }
  }

  private mergeProviderEnvironmentDefaults(
    provider: IntegrationProvider,
    config: Record<string, unknown> | null,
  ) {
    if (provider !== IntegrationProvider.MERCADO_PAGO) {
      return config;
    }

    const environmentDefaults = this.readMercadoPagoEnvironmentDefaults();

    if (!environmentDefaults && !config) {
      return null;
    }

    return {
      ...(environmentDefaults ?? {}),
      ...(config ?? {}),
    };
  }

  private readMercadoPagoEnvironmentDefaults() {
    const accessToken = readTrimmedOptionalString(
      this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN'),
    );
    const publicKey = readTrimmedOptionalString(
      this.configService.get<string>('MERCADO_PAGO_PUBLIC_KEY'),
    );
    const applicationId = readTrimmedOptionalString(
      this.configService.get<string>('MERCADO_PAGO_APPLICATION_ID'),
    );
    const webhookSecret = readTrimmedOptionalString(
      this.configService.get<string>('MERCADO_PAGO_WEBHOOK_SECRET'),
    );
    const environment =
      this.configService.get<string>('MERCADO_PAGO_ENVIRONMENT') === 'production'
        ? 'production'
        : this.configService.get<string>('MERCADO_PAGO_ENVIRONMENT') === 'test'
          ? 'test'
          : undefined;

    if (
      !accessToken &&
      !publicKey &&
      !applicationId &&
      !webhookSecret &&
      !environment
    ) {
      return null;
    }

    return {
      ...(accessToken ? { accessToken } : {}),
      ...(publicKey ? { publicKey } : {}),
      ...(applicationId ? { applicationId } : {}),
      ...(webhookSecret ? { webhookSecret } : {}),
      ...(environment ? { environment } : {}),
    } satisfies Record<string, unknown>;
  }
}
