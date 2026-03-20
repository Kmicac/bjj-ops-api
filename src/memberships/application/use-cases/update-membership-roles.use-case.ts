import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateMembershipRolesDto } from '../../dto/update-membership-roles.dto';
import { MembershipsPolicy } from '../../domain/memberships.policy';
import { MembershipsRepository } from '../../infrastructure/memberships.repository';

@Injectable()
export class UpdateMembershipRolesUseCase {
  constructor(
    private readonly membershipsPolicy: MembershipsPolicy,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    membershipId: string,
    dto: UpdateMembershipRolesDto,
  ) {
    const requestedRoles = this.membershipsPolicy.normalizeRequestedRoles(dto.roles);
    const target = await this.membershipsRepository.getMembershipManagementTarget(
      organizationId,
      membershipId,
    );

    this.membershipsPolicy.ensureCanUpdateRoles(
      principal,
      organizationId,
      target,
      requestedRoles,
    );

    await this.membershipsRepository.replaceMembershipRoles({
      organizationId,
      membershipId,
      roles: requestedRoles.map((role) => ({
        organizationId,
        membershipId,
        role,
      })),
    });

    await this.auditService.create({
      organizationId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'membership.roles.updated',
      entityType: 'OrganizationMembership',
      entityId: membershipId,
      metadata: {
        roles: requestedRoles,
      },
    });

    return this.membershipsRepository.getMembershipSummary(
      organizationId,
      membershipId,
    );
  }
}
