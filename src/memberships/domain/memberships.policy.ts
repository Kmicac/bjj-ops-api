import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import {
  MembershipRole,
  MembershipScopeType,
} from '../../generated/prisma/enums';
import { UpdateMembershipScopesDto } from '../dto/update-membership-scopes.dto';

type MembershipManagementTarget = {
  assignedRoles: MembershipRole[];
};

type BranchAccessTarget = {
  id: string;
  organizationId: string;
  headCoachMembershipId: string | null;
};

type ValidatedMembershipScope = {
  scopeType: MembershipScopeType;
  branchIds: string[];
  primaryBranchId: string | null;
};

const ROLE_RANK: Record<MembershipRole, number> = {
  [MembershipRole.MESTRE]: 70,
  [MembershipRole.ORG_ADMIN]: 60,
  [MembershipRole.ACADEMY_MANAGER]: 50,
  [MembershipRole.HEAD_COACH]: 40,
  [MembershipRole.INSTRUCTOR]: 30,
  [MembershipRole.STAFF]: 20,
  [MembershipRole.STUDENT]: 10,
};

const NON_ASSIGNABLE_ROLES = new Set<MembershipRole>([MembershipRole.HEAD_COACH]);
const ORG_ADMIN_ASSIGNABLE_ROLES = new Set<MembershipRole>([
  MembershipRole.ACADEMY_MANAGER,
  MembershipRole.INSTRUCTOR,
  MembershipRole.STAFF,
  MembershipRole.STUDENT,
]);

@Injectable()
export class MembershipsPolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  ensureCanUpdateRoles(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    target: MembershipManagementTarget,
    requestedRoles: MembershipRole[],
  ) {
    this.ensureOrganizationWideManagementAccess(principal, organizationId);
    this.ensureRolesAreAssignable(requestedRoles);
    this.ensureCanAssignRequestedRoles(principal, requestedRoles);
    this.ensureCanManageTargetMembership(principal, target);
  }

  ensureCanUpdateScopes(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    target: MembershipManagementTarget,
  ) {
    this.ensureOrganizationWideManagementAccess(principal, organizationId);
    this.ensureCanManageTargetMembership(principal, target);
  }

  ensureCanListMembers(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget | null,
  ) {
    if (!branch) {
      this.ensureOrganizationWideManagementAccess(principal, organizationId);
      return;
    }

    this.accessControl.ensureBranchAccess(
      principal,
      branch,
      MembershipRole.HEAD_COACH,
    );
  }

  normalizeRequestedRoles(roles: MembershipRole[]) {
    return [...new Set(roles)];
  }

  validateRequestedScope(
    dto: UpdateMembershipScopesDto,
    existingBranchIds: string[],
  ): ValidatedMembershipScope {
    const validBranchIds = new Set(existingBranchIds);

    if (dto.scopeType === MembershipScopeType.ORGANIZATION_WIDE) {
      if (dto.primaryBranchId && !validBranchIds.has(dto.primaryBranchId)) {
        throw new NotFoundException('primaryBranchId is invalid');
      }

      return {
        scopeType: MembershipScopeType.ORGANIZATION_WIDE,
        branchIds: [],
        primaryBranchId: dto.primaryBranchId ?? null,
      };
    }

    if (!dto.branchIds?.length) {
      throw new ConflictException(
        'branchIds are required for SELECTED_BRANCHES scope',
      );
    }

    const uniqueBranchIds = [...new Set(dto.branchIds)];

    if (uniqueBranchIds.some((branchId) => !validBranchIds.has(branchId))) {
      throw new NotFoundException('One or more branch scopes are invalid');
    }

    const primaryBranchId = dto.primaryBranchId ?? uniqueBranchIds[0];

    if (!uniqueBranchIds.includes(primaryBranchId)) {
      throw new ConflictException('primaryBranchId must be included in branchIds');
    }

    return {
      scopeType: MembershipScopeType.SELECTED_BRANCHES,
      branchIds: uniqueBranchIds,
      primaryBranchId,
    };
  }

  private ensureOrganizationWideManagementAccess(
    principal: AuthenticatedPrincipal,
    organizationId: string,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);

    if (principal.scopeType !== MembershipScopeType.ORGANIZATION_WIDE) {
      throw new ForbiddenException(
        'Organization-wide scope is required for membership management',
      );
    }

    if (this.getHighestRoleRank(principal.assignedRoles) < ROLE_RANK[MembershipRole.ORG_ADMIN]) {
      throw new ForbiddenException('Insufficient organization role');
    }
  }

  private ensureRolesAreAssignable(requestedRoles: MembershipRole[]) {
    if (requestedRoles.some((role) => NON_ASSIGNABLE_ROLES.has(role))) {
      throw new ForbiddenException(
        'HEAD_COACH is assigned through branch leadership, not generic role assignment',
      );
    }
  }

  private ensureCanAssignRequestedRoles(
    principal: AuthenticatedPrincipal,
    requestedRoles: MembershipRole[],
  ) {
    const highestPrincipalRole = this.getHighestRole(principal.assignedRoles);

    if (highestPrincipalRole === MembershipRole.MESTRE) {
      return;
    }

    if (
      highestPrincipalRole === MembershipRole.ORG_ADMIN &&
      requestedRoles.every((role) => ORG_ADMIN_ASSIGNABLE_ROLES.has(role))
    ) {
      return;
    }

    throw new ForbiddenException('Insufficient role to manage memberships');
  }

  private ensureCanManageTargetMembership(
    principal: AuthenticatedPrincipal,
    target: MembershipManagementTarget,
  ) {
    const highestPrincipalRole = this.getHighestRole(principal.assignedRoles);
    const highestTargetRole = target.assignedRoles.length
      ? this.getHighestRole(target.assignedRoles)
      : null;

    if (highestPrincipalRole === MembershipRole.MESTRE) {
      return;
    }

    if (
      highestPrincipalRole === MembershipRole.ORG_ADMIN &&
      (!highestTargetRole ||
        ROLE_RANK[highestTargetRole] < ROLE_RANK[MembershipRole.ORG_ADMIN])
    ) {
      return;
    }

    throw new ForbiddenException('Insufficient role to manage target membership');
  }

  private getHighestRole(roles: MembershipRole[]) {
    return [...roles].sort((left, right) => ROLE_RANK[right] - ROLE_RANK[left])[0];
  }

  private getHighestRoleRank(roles: MembershipRole[]) {
    const highestRole = this.getHighestRole(roles);
    return highestRole ? ROLE_RANK[highestRole] : 0;
  }
}
