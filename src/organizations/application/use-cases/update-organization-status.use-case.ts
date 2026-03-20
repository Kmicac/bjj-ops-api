import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateOrganizationStatusDto } from '../../dto/update-organization-status.dto';
import { OrganizationsPolicy } from '../../domain/organizations.policy';
import { OrganizationsRepository } from '../../infrastructure/organizations.repository';

@Injectable()
export class UpdateOrganizationStatusUseCase {
  constructor(
    private readonly organizationsPolicy: OrganizationsPolicy,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    dto: UpdateOrganizationStatusDto,
  ) {
    this.organizationsPolicy.ensureCanUpdateStatus(principal, organizationId);

    await this.organizationsRepository.updateStatus(organizationId, dto.status);

    await this.auditService.create({
      organizationId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'organization.status.updated',
      entityType: 'Organization',
      entityId: organizationId,
      metadata: {
        status: dto.status,
      },
    });

    return this.organizationsRepository.getActiveOrganizationById(organizationId);
  }
}
