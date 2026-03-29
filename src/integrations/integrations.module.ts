import { forwardRef, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { IntegrationProviderConfigService } from './application/provider-clients/integration-provider-config.service';
import { IntegrationProviderRegistry } from './application/provider-clients/integration-provider.registry';
import { IntegrationSecretConfigService } from './application/integration-secret-config.service';
import { MercadoPagoCheckoutConfigService } from './application/mercado-pago-checkout-config.service';
import { CreateMercadoPagoBillingPreferenceUseCase } from './application/use-cases/create-mercado-pago-billing-preference.use-case';
import { GetIntegrationWebhookEventUseCase } from './application/use-cases/get-integration-webhook-event.use-case';
import { ListIntegrationWebhookEventsUseCase } from './application/use-cases/list-integration-webhook-events.use-case';
import { ProcessMercadoPagoWebhookEventUseCase } from './application/use-cases/process-mercado-pago-webhook-event.use-case';
import { ReceiveMercadoPagoWebhookUseCase } from './application/use-cases/receive-mercado-pago-webhook.use-case';
import { ReprocessMercadoPagoWebhookEventUseCase } from './application/use-cases/reprocess-mercado-pago-webhook-event.use-case';
import { CreateExternalEntityLinkUseCase } from './application/use-cases/create-external-entity-link.use-case';
import { CreateIntegrationConnectionUseCase } from './application/use-cases/create-integration-connection.use-case';
import { ListExternalEntityLinksUseCase } from './application/use-cases/list-external-entity-links.use-case';
import { ListIntegrationConnectionsUseCase } from './application/use-cases/list-integration-connections.use-case';
import { ListIntegrationSyncJobsUseCase } from './application/use-cases/list-integration-sync-jobs.use-case';
import { TestIntegrationConnectionUseCase } from './application/use-cases/test-integration-connection.use-case';
import { TriggerIntegrationSyncUseCase } from './application/use-cases/trigger-integration-sync.use-case';
import { UpdateIntegrationConnectionUseCase } from './application/use-cases/update-integration-connection.use-case';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsWebhooksController } from './integrations-webhooks.controller';
import { IntegrationWebhookEventsPolicy } from './domain/integration-webhook-events.policy';
import { IntegrationsPolicy } from './domain/integrations.policy';
import { MercadoPagoWebhookPolicy } from './domain/mercado-pago-webhook.policy';
import { IntegrationsRepository } from './infrastructure/integrations.repository';
import { MercadoPagoProviderClient } from './infrastructure/provider-clients/mercado-pago-provider.client';

@Module({
  imports: [AuthModule, AuditModule, forwardRef(() => BillingModule)],
  controllers: [IntegrationsController, IntegrationsWebhooksController],
  providers: [
    IntegrationsRepository,
    IntegrationsPolicy,
    IntegrationWebhookEventsPolicy,
    MercadoPagoWebhookPolicy,
    IntegrationSecretConfigService,
    MercadoPagoCheckoutConfigService,
    IntegrationProviderRegistry,
    IntegrationProviderConfigService,
    MercadoPagoProviderClient,
    CreateMercadoPagoBillingPreferenceUseCase,
    ReceiveMercadoPagoWebhookUseCase,
    ProcessMercadoPagoWebhookEventUseCase,
    ReprocessMercadoPagoWebhookEventUseCase,
    CreateIntegrationConnectionUseCase,
    ListIntegrationConnectionsUseCase,
    UpdateIntegrationConnectionUseCase,
    TestIntegrationConnectionUseCase,
    TriggerIntegrationSyncUseCase,
    ListIntegrationSyncJobsUseCase,
    ListIntegrationWebhookEventsUseCase,
    GetIntegrationWebhookEventUseCase,
    CreateExternalEntityLinkUseCase,
    ListExternalEntityLinksUseCase,
  ],
  exports: [CreateMercadoPagoBillingPreferenceUseCase],
})
export class IntegrationsModule {}
