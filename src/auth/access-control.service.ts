import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  MembershipRole,
  MembershipScopeType,
} from '../generated/prisma/enums';
import type { AuthenticatedPrincipal } from './authenticated-principal.interface';

type BranchAccessTarget = {
  id: string;
  organizationId: string;
  headCoachMembershipId: string | null;
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

@Injectable()
export class AccessControlService {
  ensureOrganizationAccess(principal: AuthenticatedPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) {
      throw new ForbiddenException('Organization access denied');
    }
  }

  ensureOrganizationRole(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    minimumRole: MembershipRole,
  ) {
    this.ensureOrganizationAccess(principal, organizationId);

    if (
      this.getHighestRoleRank(principal.assignedRoles) < ROLE_RANK[minimumRole]
    ) {
      throw new ForbiddenException('Insufficient organization role');
    }
  }

  ensureBranchAccess(
    principal: AuthenticatedPrincipal,
    branch: BranchAccessTarget,
    minimumRole: MembershipRole = MembershipRole.STUDENT,
  ) {
    this.ensureOrganizationAccess(principal, branch.organizationId);

    if (
      principal.scopeType !== MembershipScopeType.ORGANIZATION_WIDE &&
      !principal.branchIds.includes(branch.id)
    ) {
      throw new ForbiddenException('Branch access denied');
    }

    const effectiveRoles = this.getEffectiveBranchRoles(
      principal,
      branch.headCoachMembershipId,
    );

    if (this.getHighestRoleRank(effectiveRoles) < ROLE_RANK[minimumRole]) {
      throw new ForbiddenException('Insufficient branch role');
    }
  }

  getEffectiveBranchRoles(
    principal: AuthenticatedPrincipal,
    headCoachMembershipId: string | null,
  ): MembershipRole[] {
    const roles = new Set(principal.assignedRoles);

    if (headCoachMembershipId === principal.membershipId) {
      roles.add(MembershipRole.HEAD_COACH);
    }

    return [...roles];
  }

  getHighestAssignedRole(principal: AuthenticatedPrincipal): MembershipRole {
    return this.getHighestRole(principal.assignedRoles);
  }

  getHighestBranchRole(
    principal: AuthenticatedPrincipal,
    headCoachMembershipId: string | null,
  ): MembershipRole {
    return this.getHighestRole(
      this.getEffectiveBranchRoles(principal, headCoachMembershipId),
    );
  }

  ensureRolesAreAssignable(requestedRoles: MembershipRole[]) {
    if (requestedRoles.some((role) => NON_ASSIGNABLE_ROLES.has(role))) {
      throw new ForbiddenException(
        'HEAD_COACH is assigned through branch leadership, not generic role assignment',
      );
    }
  }

  ensureCanManageRoles(
    principal: AuthenticatedPrincipal,
    requestedRoles: MembershipRole[],
  ) {
    this.ensureRolesAreAssignable(requestedRoles);

    const highestPrincipalRole = this.getHighestAssignedRole(principal);

    if (highestPrincipalRole === MembershipRole.MESTRE) {
      return;
    }

    if (
      highestPrincipalRole === MembershipRole.ORG_ADMIN &&
      requestedRoles.every((role) =>
        ([
          MembershipRole.ACADEMY_MANAGER,
          MembershipRole.INSTRUCTOR,
          MembershipRole.STAFF,
          MembershipRole.STUDENT,
        ] as MembershipRole[]).includes(role),
      )
    ) {
      return;
    }

    throw new ForbiddenException('Insufficient role to manage memberships');
  }

  ensureCanManageTargetMembership(
    principal: AuthenticatedPrincipal,
    targetRoles: MembershipRole[],
  ) {
    const highestPrincipalRole = this.getHighestAssignedRole(principal);
    const highestTargetRole = targetRoles.length
      ? this.getHighestRole(targetRoles)
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

  private getHighestRole(roles: MembershipRole[]): MembershipRole {
    return [...roles].sort((left, right) => ROLE_RANK[right] - ROLE_RANK[left])[0];
  }

  private getHighestRoleRank(roles: MembershipRole[]): number {
    const highestRole = this.getHighestRole(roles);
    return highestRole ? ROLE_RANK[highestRole] : 0;
  }
}
