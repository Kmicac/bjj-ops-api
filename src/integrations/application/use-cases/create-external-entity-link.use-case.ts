import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreateExternalEntityLinkDto } from '../../dto/create-external-entity-link.dto';
import { IntegrationsPolicy } from '../../domain/integrations.policy';
import { IntegrationsRepository } from '../../infrastructure/integrations.repository';

@Injectable()
export class CreateExternalEntityLinkUseCase {
  constructor(
    private readonly integrationsPolicy: IntegrationsPolicy,
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    integrationId: string,
    dto: CreateExternalEntityLinkDto,
  ) {
    const connection =
      await this.integrationsRepository.getIntegrationConnectionManagementTarget(
        organizationId,
        integrationId,
      );
    this.integrationsPolicy.ensureCanManageConnection(principal, connection);

    const link = await this.integrationsRepository.createExternalEntityLink({
      organizationId,
      branchId: connection.branchId,
      integrationConnectionId: connection.id,
      provider: connection.provider,
      entityType: dto.entityType,
      internalEntityId: dto.internalEntityId.trim(),
      externalEntityId: dto.externalEntityId.trim(),
      externalReference: dto.externalReference?.trim(),
      metadataJson: dto.metadataJson as Prisma.InputJsonObject | undefined,
      createdByMembershipId: principal.membershipId,
    });

    await this.auditService.create({
      organizationId,
      branchId: connection.branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'external_entity_link.created',
      entityType: 'ExternalEntityLink',
      entityId: link.id,
      metadata: {
        integrationConnectionId: connection.id,
        provider: link.provider,
        entityType: link.entityType,
      },
    });

    return link;
  }
}
