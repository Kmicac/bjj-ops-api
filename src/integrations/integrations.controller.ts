import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/authenticated-principal.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateExternalEntityLinkUseCase } from './application/use-cases/create-external-entity-link.use-case';
import { CreateIntegrationConnectionUseCase } from './application/use-cases/create-integration-connection.use-case';
import { ListExternalEntityLinksUseCase } from './application/use-cases/list-external-entity-links.use-case';
import { ListIntegrationConnectionsUseCase } from './application/use-cases/list-integration-connections.use-case';
import { ListIntegrationSyncJobsUseCase } from './application/use-cases/list-integration-sync-jobs.use-case';
import { TestIntegrationConnectionUseCase } from './application/use-cases/test-integration-connection.use-case';
import { TriggerIntegrationSyncUseCase } from './application/use-cases/trigger-integration-sync.use-case';
import { UpdateIntegrationConnectionUseCase } from './application/use-cases/update-integration-connection.use-case';
import { CreateExternalEntityLinkDto } from './dto/create-external-entity-link.dto';
import { CreateIntegrationConnectionDto } from './dto/create-integration-connection.dto';
import { ListExternalEntityLinksQueryDto } from './dto/list-external-entity-links.query.dto';
import { ListIntegrationsQueryDto } from './dto/list-integrations.query.dto';
import { ListIntegrationSyncJobsQueryDto } from './dto/list-integration-sync-jobs.query.dto';
import { TriggerIntegrationSyncDto } from './dto/trigger-integration-sync.dto';
import { UpdateIntegrationConnectionDto } from './dto/update-integration-connection.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/integrations')
export class IntegrationsController {
  constructor(
    private readonly createIntegrationConnectionUseCase: CreateIntegrationConnectionUseCase,
    private readonly listIntegrationConnectionsUseCase: ListIntegrationConnectionsUseCase,
    private readonly updateIntegrationConnectionUseCase: UpdateIntegrationConnectionUseCase,
    private readonly testIntegrationConnectionUseCase: TestIntegrationConnectionUseCase,
    private readonly triggerIntegrationSyncUseCase: TriggerIntegrationSyncUseCase,
    private readonly listIntegrationSyncJobsUseCase: ListIntegrationSyncJobsUseCase,
    private readonly createExternalEntityLinkUseCase: CreateExternalEntityLinkUseCase,
    private readonly listExternalEntityLinksUseCase: ListExternalEntityLinksUseCase,
  ) {}

  @Post()
  createConnection(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateIntegrationConnectionDto,
  ) {
    return this.createIntegrationConnectionUseCase.execute(
      principal,
      organizationId,
      dto,
    );
  }

  @Get()
  listConnections(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Query() query: ListIntegrationsQueryDto,
  ) {
    return this.listIntegrationConnectionsUseCase.execute(
      principal,
      organizationId,
      query,
    );
  }

  @Patch(':integrationId')
  updateConnection(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('integrationId') integrationId: string,
    @Body() dto: UpdateIntegrationConnectionDto,
  ) {
    return this.updateIntegrationConnectionUseCase.execute(
      principal,
      organizationId,
      integrationId,
      dto,
    );
  }

  @Post(':integrationId/test')
  testConnection(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('integrationId') integrationId: string,
  ) {
    return this.testIntegrationConnectionUseCase.execute(
      principal,
      organizationId,
      integrationId,
    );
  }

  @Post(':integrationId/sync')
  triggerSync(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('integrationId') integrationId: string,
    @Body() dto: TriggerIntegrationSyncDto,
  ) {
    return this.triggerIntegrationSyncUseCase.execute(
      principal,
      organizationId,
      integrationId,
      dto,
    );
  }

  @Get(':integrationId/sync-jobs')
  listSyncJobs(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('integrationId') integrationId: string,
    @Query() query: ListIntegrationSyncJobsQueryDto,
  ) {
    return this.listIntegrationSyncJobsUseCase.execute(
      principal,
      organizationId,
      integrationId,
      query,
    );
  }

  @Post(':integrationId/external-links')
  createExternalLink(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('integrationId') integrationId: string,
    @Body() dto: CreateExternalEntityLinkDto,
  ) {
    return this.createExternalEntityLinkUseCase.execute(
      principal,
      organizationId,
      integrationId,
      dto,
    );
  }

  @Get(':integrationId/external-links')
  listExternalLinks(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('integrationId') integrationId: string,
    @Query() query: ListExternalEntityLinksQueryDto,
  ) {
    return this.listExternalEntityLinksUseCase.execute(
      principal,
      organizationId,
      integrationId,
      query,
    );
  }
}
