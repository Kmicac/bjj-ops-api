import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationProviderConfigService } from './application/provider-clients/integration-provider-config.service';
import { IntegrationProviderRegistry } from './application/provider-clients/integration-provider.registry';
import { IntegrationSecretConfigService } from './application/integration-secret-config.service';
import { CreateExternalEntityLinkUseCase } from './application/use-cases/create-external-entity-link.use-case';
import { CreateIntegrationConnectionUseCase } from './application/use-cases/create-integration-connection.use-case';
import { ListExternalEntityLinksUseCase } from './application/use-cases/list-external-entity-links.use-case';
import { ListIntegrationConnectionsUseCase } from './application/use-cases/list-integration-connections.use-case';
import { ListIntegrationSyncJobsUseCase } from './application/use-cases/list-integration-sync-jobs.use-case';
import { TestIntegrationConnectionUseCase } from './application/use-cases/test-integration-connection.use-case';
import { TriggerIntegrationSyncUseCase } from './application/use-cases/trigger-integration-sync.use-case';
import { UpdateIntegrationConnectionUseCase } from './application/use-cases/update-integration-connection.use-case';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsPolicy } from './domain/integrations.policy';
import { IntegrationsRepository } from './infrastructure/integrations.repository';
import { MercadoPagoProviderClient } from './infrastructure/provider-clients/mercado-pago-provider.client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsRepository,
    IntegrationsPolicy,
    IntegrationSecretConfigService,
    IntegrationProviderRegistry,
    IntegrationProviderConfigService,
    MercadoPagoProviderClient,
    CreateIntegrationConnectionUseCase,
    ListIntegrationConnectionsUseCase,
    UpdateIntegrationConnectionUseCase,
    TestIntegrationConnectionUseCase,
    TriggerIntegrationSyncUseCase,
    ListIntegrationSyncJobsUseCase,
    CreateExternalEntityLinkUseCase,
    ListExternalEntityLinksUseCase,
  ],
})
export class IntegrationsModule {}
