import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { IntegrationProvider } from '../../../generated/prisma/enums';
import { IntegrationSecretConfigService } from '../integration-secret-config.service';
import { IntegrationProviderRegistry } from './integration-provider.registry';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class IntegrationProviderConfigService {
  constructor(
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
    storedConfig: Prisma.JsonValue | null | undefined,
  ) {
    if (storedConfig === undefined || storedConfig === null) {
      return null;
    }

    const providerClient = this.integrationProviderRegistry.getClient(provider);

    if (!providerClient) {
      if (!isPlainObject(storedConfig)) {
        throw new ConflictException('Stored integration configuration is invalid');
      }

      return storedConfig;
    }

    const decryptedConfig =
      this.integrationSecretConfigService.decryptObject(storedConfig);

    if (!decryptedConfig) {
      return null;
    }

    return this.validateProviderConfig(provider, decryptedConfig);
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
}
