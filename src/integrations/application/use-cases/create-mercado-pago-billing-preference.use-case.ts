import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  ExternalEntityType,
  IntegrationProvider,
} from '../../../generated/prisma/enums';
import { IntegrationProviderConfigService } from '../provider-clients/integration-provider-config.service';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';
import {
  MercadoPagoCheckoutPreferenceResult,
  MercadoPagoProviderClient,
} from '../../infrastructure/provider-clients/mercado-pago-provider.client';

type BillingPreferenceMetadata = {
  kind: 'mercado_pago_checkout_pro_preference';
  environment: 'test' | 'production';
  initPoint: string;
  sandboxInitPoint?: string;
  amount: string;
  currency: string;
};

type ExistingBillingChargeExternalLink = {
  externalEntityId: string;
  externalReference: string | null;
  metadataJson: Prisma.JsonValue | null;
};

export type CreateMercadoPagoBillingPreferenceResult = {
  connectionId: string;
  environment: 'test' | 'production';
  preferenceId: string;
  externalReference: string;
  initPoint: string;
  sandboxInitPoint?: string;
  reused: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readBillingPreferenceMetadata(
  value: Prisma.JsonValue | null,
): BillingPreferenceMetadata | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (
    value.kind !== 'mercado_pago_checkout_pro_preference' ||
    (value.environment !== 'test' && value.environment !== 'production') ||
    typeof value.initPoint !== 'string' ||
    typeof value.amount !== 'string' ||
    typeof value.currency !== 'string'
  ) {
    return null;
  }

  return {
    kind: 'mercado_pago_checkout_pro_preference',
    environment: value.environment,
    initPoint: value.initPoint,
    sandboxInitPoint:
      typeof value.sandboxInitPoint === 'string'
        ? value.sandboxInitPoint
        : undefined,
    amount: value.amount,
    currency: value.currency,
  };
}

@Injectable()
export class CreateMercadoPagoBillingPreferenceUseCase {
  constructor(
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly integrationProviderConfigService: IntegrationProviderConfigService,
    private readonly mercadoPagoProviderClient: MercadoPagoProviderClient,
  ) {}

  async execute(params: {
    organizationId: string;
    branchId: string;
    billingChargeId: string;
    billingChargeExternalReference?: string | null;
    title: string;
    description?: string;
    amount: number;
    currency: string;
    externalReference: string;
    createdByMembershipId: string;
  }): Promise<CreateMercadoPagoBillingPreferenceResult> {
    const connection =
      await this.integrationsRepository.getSingleActiveBranchConnectionByProvider(
        params.organizationId,
        params.branchId,
        IntegrationProvider.MERCADO_PAGO,
      );

    const existingLink =
      await this.integrationsRepository.findSingleExternalEntityLinkByInternalEntity(
        {
          organizationId: params.organizationId,
          integrationConnectionId: connection.id,
          entityType: ExternalEntityType.BILLING_CHARGE,
          internalEntityId: params.billingChargeId,
        },
      );

    if (existingLink) {
      return this.buildExistingPreferenceResult(
        existingLink,
        params.billingChargeExternalReference,
        params.amount,
        params.currency,
        connection.id,
      );
    }

    if (params.billingChargeExternalReference) {
      throw new ConflictException(
        'Billing charge already has a Mercado Pago preference reference',
      );
    }

    const providerConfig =
      this.integrationProviderConfigService.resolveConfigForProvider(
        connection.provider,
        connection.configJson,
      );

    if (!providerConfig) {
      throw new ConflictException(
        'Mercado Pago credentials are not configured for this branch integration',
      );
    }

    const preference =
      await this.mercadoPagoProviderClient.createCheckoutProPreference(
        providerConfig,
        {
          title: params.title,
          description: params.description,
          externalReference: params.externalReference,
          currency: params.currency,
          amount: params.amount,
        },
      );

    try {
      await this.integrationsRepository.createExternalEntityLink({
        organizationId: params.organizationId,
        branchId: params.branchId,
        integrationConnectionId: connection.id,
        provider: IntegrationProvider.MERCADO_PAGO,
        entityType: ExternalEntityType.BILLING_CHARGE,
        internalEntityId: params.billingChargeId,
        externalEntityId: preference.preferenceId,
        externalReference: params.externalReference,
        metadataJson: this.buildMetadata(
          params.amount,
          params.currency,
          preference,
        ),
        createdByMembershipId: params.createdByMembershipId,
      });
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        throw error;
      }

      const concurrentLink =
        await this.integrationsRepository.findSingleExternalEntityLinkByInternalEntity(
          {
            organizationId: params.organizationId,
            integrationConnectionId: connection.id,
            entityType: ExternalEntityType.BILLING_CHARGE,
            internalEntityId: params.billingChargeId,
          },
        );

      if (!concurrentLink) {
        throw error;
      }

      return this.buildExistingPreferenceResult(
        concurrentLink,
        params.billingChargeExternalReference,
        params.amount,
        params.currency,
        connection.id,
      );
    }

    return {
      connectionId: connection.id,
      environment: preference.environment,
      preferenceId: preference.preferenceId,
      externalReference: params.externalReference,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      reused: false,
    };
  }

  private buildExistingPreferenceResult(
    existingLink: ExistingBillingChargeExternalLink,
    billingChargeExternalReference: string | null | undefined,
    amount: number,
    currency: string,
    connectionId: string,
  ): CreateMercadoPagoBillingPreferenceResult {
    if (
      billingChargeExternalReference &&
      billingChargeExternalReference !== existingLink.externalEntityId
    ) {
      throw new ConflictException(
        'Billing charge external reference does not match the stored Mercado Pago link',
      );
    }

    const metadata = readBillingPreferenceMetadata(existingLink.metadataJson);

    if (!metadata) {
      throw new ConflictException(
        'Stored Mercado Pago preference metadata is unavailable',
      );
    }

    if (metadata.amount !== amount.toFixed(2) || metadata.currency !== currency) {
      throw new ConflictException(
        'Existing Mercado Pago preference does not match the current billing charge balance',
      );
    }

    if (!existingLink.externalReference) {
      throw new NotFoundException(
        'Stored Mercado Pago preference external reference is unavailable',
      );
    }

    return {
      connectionId,
      environment: metadata.environment,
      preferenceId: existingLink.externalEntityId,
      externalReference: existingLink.externalReference,
      initPoint: metadata.initPoint,
      sandboxInitPoint: metadata.sandboxInitPoint,
      reused: true,
    };
  }

  private buildMetadata(
    amount: number,
    currency: string,
    preference: MercadoPagoCheckoutPreferenceResult,
  ) {
    return {
      kind: 'mercado_pago_checkout_pro_preference',
      environment: preference.environment,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      amount: amount.toFixed(2),
      currency,
    } satisfies Prisma.InputJsonObject;
  }
}
