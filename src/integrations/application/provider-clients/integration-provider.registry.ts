import { Injectable } from '@nestjs/common';
import { IntegrationProvider } from '../../../generated/prisma/enums';
import { MercadoPagoProviderClient } from '../../infrastructure/provider-clients/mercado-pago-provider.client';
import { IntegrationProviderClient } from './integration-provider-client.interface';

@Injectable()
export class IntegrationProviderRegistry {
  private readonly clients: Partial<
    Record<IntegrationProvider, IntegrationProviderClient>
  >;

  constructor(
    private readonly mercadoPagoProviderClient: MercadoPagoProviderClient,
  ) {
    this.clients = {
      [this.mercadoPagoProviderClient.providerName]:
        this.mercadoPagoProviderClient,
    };
  }

  getClient(provider: IntegrationProvider) {
    return this.clients[provider] ?? null;
  }
}
