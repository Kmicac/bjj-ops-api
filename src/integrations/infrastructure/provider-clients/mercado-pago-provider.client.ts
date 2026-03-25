import { Injectable } from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationSyncKind,
  IntegrationSyncStatus,
} from '../../../generated/prisma/enums';
import {
  IntegrationProviderClient,
  IntegrationProviderTestConnectionResult,
} from '../../application/provider-clients/integration-provider-client.interface';

type MercadoPagoProviderConfig = {
  accessToken: string;
  publicKey?: string;
  applicationId?: string;
  environment: 'test' | 'production';
};

const MERCADO_PAGO_USERS_ME_URL = 'https://api.mercadolibre.com/users/me';
const DEFAULT_TIMEOUT_MS = 5000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asTrimmedOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

@Injectable()
export class MercadoPagoProviderClient implements IntegrationProviderClient {
  readonly providerName = IntegrationProvider.MERCADO_PAGO;
  readonly supportedSyncKinds: readonly IntegrationSyncKind[] = [];

  validateConfig(config: unknown) {
    if (!isPlainObject(config)) {
      throw new Error('Mercado Pago config must be an object');
    }

    const accessToken = asTrimmedOptionalString(config.accessToken);

    if (!accessToken || accessToken.length < 20) {
      throw new Error('Mercado Pago accessToken is required');
    }

    const publicKey = asTrimmedOptionalString(config.publicKey);
    const applicationId = asTrimmedOptionalString(config.applicationId);
    const environment =
      config.environment === 'production' ? 'production' : 'test';

    return {
      accessToken,
      publicKey,
      applicationId,
      environment,
    } satisfies MercadoPagoProviderConfig as Record<string, unknown>;
  }

  async testConnection(config: Record<string, unknown>) {
    const validatedConfig = this.getValidatedConfig(config);

    try {
      const response = await fetch(MERCADO_PAGO_USERS_ME_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validatedConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });

      if (!response.ok) {
        return this.buildFailureResult(
          validatedConfig.environment,
          response.status,
        );
      }

      const payload = await this.readJsonRecord(response);

      return {
        status: IntegrationSyncStatus.SUCCEEDED,
        summaryJson: {
          mode: 'provider',
          provider: this.providerName,
          environment: validatedConfig.environment,
          supportsSyncKinds: this.supportedSyncKinds,
          account: {
            userId:
              typeof payload.id === 'number' || typeof payload.id === 'string'
                ? String(payload.id)
                : undefined,
            nickname:
              typeof payload.nickname === 'string'
                ? payload.nickname
                : undefined,
            siteId:
              typeof payload.site_id === 'string' ? payload.site_id : undefined,
            countryId:
              typeof payload.country_id === 'string'
                ? payload.country_id
                : undefined,
            status:
              typeof payload.status === 'string' ? payload.status : undefined,
          },
          publicKeyConfigured: Boolean(validatedConfig.publicKey),
          applicationIdConfigured: Boolean(validatedConfig.applicationId),
        },
      } satisfies IntegrationProviderTestConnectionResult;
    } catch (error) {
      return this.buildUnexpectedFailureResult(
        validatedConfig.environment,
        error,
      );
    }
  }

  private getValidatedConfig(config: Record<string, unknown>) {
    return this.validateConfig(config) as unknown as MercadoPagoProviderConfig;
  }

  private buildFailureResult(environment: 'test' | 'production', status: number) {
    return {
      status: IntegrationSyncStatus.FAILED,
      errorMessage: this.mapHttpStatusToSafeMessage(status),
      summaryJson: {
        mode: 'provider',
        provider: this.providerName,
        environment,
        httpStatus: status,
      },
    } satisfies IntegrationProviderTestConnectionResult;
  }

  private buildUnexpectedFailureResult(
    environment: 'test' | 'production',
    error: unknown,
  ) {
    const errorName =
      error instanceof Error && error.name ? error.name : 'UnknownError';

    return {
      status: IntegrationSyncStatus.FAILED,
      errorMessage:
        errorName === 'TimeoutError' || errorName === 'AbortError'
          ? 'Mercado Pago test request timed out'
          : 'Mercado Pago test request could not be completed',
      summaryJson: {
        mode: 'provider',
        provider: this.providerName,
        environment,
        errorType: errorName,
      },
    } satisfies IntegrationProviderTestConnectionResult;
  }

  private mapHttpStatusToSafeMessage(status: number) {
    if (status === 400) {
      return 'Mercado Pago rejected the provided configuration';
    }

    if (status === 401 || status === 403) {
      return 'Mercado Pago rejected the access token';
    }

    if (status === 429) {
      return 'Mercado Pago rate limited the test request';
    }

    if (status >= 500) {
      return 'Mercado Pago is temporarily unavailable';
    }

    return `Mercado Pago returned HTTP ${status}`;
  }

  private async readJsonRecord(response: Response) {
    const body = await response.text();

    if (!body) {
      return {};
    }

    try {
      const parsed = JSON.parse(body);
      return isPlainObject(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
}
