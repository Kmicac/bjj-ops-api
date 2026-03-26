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
  webhookSecret?: string;
  environment: 'test' | 'production';
};

export type MercadoPagoCheckoutPreferenceInput = {
  title: string;
  description?: string;
  externalReference: string;
  currency: string;
  amount: number;
};

export type MercadoPagoCheckoutPreferenceResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  environment: 'test' | 'production';
};

export type MercadoPagoPaymentResource = {
  id: string;
  externalReference?: string;
  status?: string;
  statusDetail?: string;
  transactionAmount?: number;
  currency?: string;
  liveMode?: boolean;
  dateCreated?: string;
  dateApproved?: string;
  dateLastUpdated?: string;
};

const MERCADO_PAGO_USERS_ME_URL = 'https://api.mercadolibre.com/users/me';
const MERCADO_PAGO_CHECKOUT_PREFERENCES_URL =
  'https://api.mercadopago.com/checkout/preferences';
const MERCADO_PAGO_PAYMENTS_URL = 'https://api.mercadopago.com/v1/payments';
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
    const webhookSecret = asTrimmedOptionalString(config.webhookSecret);
    const environment =
      config.environment === 'production' ? 'production' : 'test';

    return {
      accessToken,
      publicKey,
      applicationId,
      webhookSecret,
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

  async createCheckoutProPreference(
    config: Record<string, unknown>,
    input: MercadoPagoCheckoutPreferenceInput,
  ): Promise<MercadoPagoCheckoutPreferenceResult> {
    const validatedConfig = this.getValidatedConfig(config);

    let response: Response;

    try {
      response = await fetch(MERCADO_PAGO_CHECKOUT_PREFERENCES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validatedConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              title: input.title,
              description: input.description,
              quantity: 1,
              currency_id: input.currency,
              unit_price: input.amount,
            },
          ],
          external_reference: input.externalReference,
        }),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
    } catch (error) {
      this.throwSafePreferenceError(error);
    }

    if (!response.ok) {
      throw new Error(this.mapCreatePreferenceHttpStatusToSafeMessage(response.status));
    }

    const payload = await this.readJsonRecord(response);
    const preferenceId = asTrimmedOptionalString(payload.id);
    const initPoint = asTrimmedOptionalString(payload.init_point);
    const sandboxInitPoint = asTrimmedOptionalString(payload.sandbox_init_point);

    if (!preferenceId || !initPoint) {
      throw new Error('Mercado Pago returned an incomplete checkout preference response');
    }

    return {
      preferenceId,
      initPoint,
      sandboxInitPoint,
      environment: validatedConfig.environment,
    };
  }

  async getPaymentById(
    config: Record<string, unknown>,
    paymentId: string,
  ): Promise<MercadoPagoPaymentResource> {
    const validatedConfig = this.getValidatedConfig(config);

    let response: Response;

    try {
      response = await fetch(`${MERCADO_PAGO_PAYMENTS_URL}/${paymentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validatedConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
    } catch (error) {
      this.throwSafePaymentLookupError(error);
    }

    if (!response.ok) {
      throw new Error(this.mapPaymentLookupHttpStatusToSafeMessage(response.status));
    }

    const payload = await this.readJsonRecord(response);
    const id =
      typeof payload.id === 'number' || typeof payload.id === 'string'
        ? String(payload.id)
        : undefined;

    if (!id) {
      throw new Error('Mercado Pago returned an incomplete payment response');
    }

    return {
      id,
      externalReference: asTrimmedOptionalString(payload.external_reference),
      status: asTrimmedOptionalString(payload.status),
      statusDetail: asTrimmedOptionalString(payload.status_detail),
      transactionAmount:
        typeof payload.transaction_amount === 'number'
          ? payload.transaction_amount
          : undefined,
      currency: asTrimmedOptionalString(payload.currency_id),
      liveMode:
        typeof payload.live_mode === 'boolean' ? payload.live_mode : undefined,
      dateCreated: asTrimmedOptionalString(payload.date_created),
      dateApproved: asTrimmedOptionalString(payload.date_approved),
      dateLastUpdated: asTrimmedOptionalString(payload.date_last_updated),
    };
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

  private mapCreatePreferenceHttpStatusToSafeMessage(status: number) {
    if (status === 400) {
      return 'Mercado Pago rejected the checkout preference payload';
    }

    if (status === 401 || status === 403) {
      return 'Mercado Pago rejected the access token';
    }

    if (status === 404) {
      return 'Mercado Pago checkout preference endpoint is unavailable';
    }

    if (status === 429) {
      return 'Mercado Pago rate limited the checkout preference request';
    }

    if (status >= 500) {
      return 'Mercado Pago is temporarily unavailable';
    }

    return `Mercado Pago returned HTTP ${status}`;
  }

  private mapPaymentLookupHttpStatusToSafeMessage(status: number) {
    if (status === 400) {
      return 'Mercado Pago rejected the payment lookup request';
    }

    if (status === 401 || status === 403) {
      return 'Mercado Pago rejected the access token';
    }

    if (status === 404) {
      return 'Mercado Pago payment resource was not found';
    }

    if (status === 429) {
      return 'Mercado Pago rate limited the payment lookup request';
    }

    if (status >= 500) {
      return 'Mercado Pago is temporarily unavailable';
    }

    return `Mercado Pago returned HTTP ${status}`;
  }

  private throwSafePreferenceError(error: unknown): never {
    const errorName =
      error instanceof Error && error.name ? error.name : 'UnknownError';

    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      throw new Error('Mercado Pago checkout preference request timed out');
    }

    throw new Error('Mercado Pago checkout preference request could not be completed');
  }

  private throwSafePaymentLookupError(error: unknown): never {
    const errorName =
      error instanceof Error && error.name ? error.name : 'UnknownError';

    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      throw new Error('Mercado Pago payment lookup request timed out');
    }

    throw new Error('Mercado Pago payment lookup request could not be completed');
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
