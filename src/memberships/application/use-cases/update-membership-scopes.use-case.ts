import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateMembershipScopesDto } from '../../dto/update-membership-scopes.dto';
import { MembershipsPolicy } from '../../domain/memberships.policy';
import { MembershipsRepository } from '../../infrastructure/memberships.repository';

@Injectable()
export class UpdateMembershipScopesUseCase {
  constructor(
    private readonly membershipsPolicy: MembershipsPolicy,
    private readonly membershipsRepository: MembershipsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    membershipId: string,
    dto: UpdateMembershipScopesDto,
  ) {
    const target = await this.membershipsRepository.getMembershipManagementTarget(
      organizationId,
      membershipId,
    );

    this.membershipsPolicy.ensureCanUpdateScopes(
      principal,
      organizationId,
      target,
    );

    const branchIdsToValidate = [
      ...(dto.branchIds ?? []),
      ...(dto.primaryBranchId ? [dto.primaryBranchId] : []),
    ];
    const uniqueBranchIds = [...new Set(branchIdsToValidate)];
    const existingBranchIds = await this.membershipsRepository.findExistingBranchIds(
      organizationId,
      uniqueBranchIds,
    );
    const validatedScope = this.membershipsPolicy.validateRequestedScope(
      dto,
      existingBranchIds,
    );

    await this.membershipsRepository.replaceMembershipScopes({
      membershipId,
      scopeType: validatedScope.scopeType,
      primaryBranchId: validatedScope.primaryBranchId,
      branchIds: validatedScope.branchIds,
    });

    await this.auditService.create({
      organizationId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'membership.scopes.updated',
      entityType: 'OrganizationMembership',
      entityId: membershipId,
      metadata: validatedScope,
    });

    return this.membershipsRepository.getMembershipSummary(
      organizationId,
      membershipId,
    );
  }
}
