import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import {
  IntegrationProvider,
  IntegrationScopeType,
  IntegrationSyncKind,
  MembershipRole,
  MembershipScopeType,
} from '../../generated/prisma/enums';

type BranchAccessTarget = {
  id: string;
  organizationId: string;
  headCoachMembershipId: string | null;
};

type ConnectionAccessTarget = {
  organizationId: string;
  scopeType: IntegrationScopeType;
  branchId: string | null;
  branch: BranchAccessTarget | null;
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

@Injectable()
export class IntegrationsPolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  normalizeDisplayName(displayName: string) {
    const normalized = displayName.trim();

    if (normalized.length < 2) {
      throw new ConflictException(
        'displayName must contain at least 2 non-space characters',
      );
    }

    return normalized;
  }

  ensureValidScopeAssignment(
    scopeType: IntegrationScopeType,
    branchId?: string | null,
  ) {
    if (
      scopeType === IntegrationScopeType.ORGANIZATION &&
      branchId !== undefined &&
      branchId !== null
    ) {
      throw new ConflictException(
        'Organization-level integrations cannot target a branch',
      );
    }

    if (
      scopeType === IntegrationScopeType.BRANCH &&
      (!branchId || branchId.trim().length === 0)
    ) {
      throw new ConflictException(
        'branchId is required for branch-level integrations',
      );
    }
  }

  ensureProviderScopeAllowed(
    provider: IntegrationProvider,
    scopeType: IntegrationScopeType,
  ) {
    if (
      provider === IntegrationProvider.MERCADO_PAGO &&
      scopeType !== IntegrationScopeType.BRANCH
    ) {
      throw new ConflictException(
        'Mercado Pago integrations must be configured at branch scope',
      );
    }
  }

  ensureCanManageOrganizationConnections(
    principal: AuthenticatedPrincipal,
    organizationId: string,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);

    if (principal.scopeType !== MembershipScopeType.ORGANIZATION_WIDE) {
      throw new ForbiddenException(
        'Organization-wide scope is required for organization-level integrations',
      );
    }

    if (
      this.getHighestRoleRank(principal.assignedRoles) <
      ROLE_RANK[MembershipRole.ORG_ADMIN]
    ) {
      throw new ForbiddenException('Insufficient organization role');
    }
  }

  ensureCanManageBranchConnections(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
    this.accessControl.ensureBranchAccess(
      principal,
      branch,
      MembershipRole.ACADEMY_MANAGER,
    );
  }

  ensureCanListBranchLevelConnections(
    principal: AuthenticatedPrincipal,
    organizationId: string,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);

    if (
      this.getHighestRoleRank(principal.assignedRoles) <
      ROLE_RANK[MembershipRole.ACADEMY_MANAGER]
    ) {
      throw new ForbiddenException('Insufficient organization role');
    }

    if (
      principal.scopeType === MembershipScopeType.SELECTED_BRANCHES &&
      principal.branchIds.length === 0
    ) {
      throw new ForbiddenException('Branch scope is required');
    }
  }

  ensureCanManageConnection(
    principal: AuthenticatedPrincipal,
    connection: ConnectionAccessTarget,
  ) {
    if (connection.scopeType === IntegrationScopeType.ORGANIZATION) {
      this.ensureCanManageOrganizationConnections(
        principal,
        connection.organizationId,
      );
      return;
    }

    if (!connection.branch || !connection.branchId) {
      throw new ConflictException(
        'Branch-scoped integration is missing branch context',
      );
    }

    this.ensureCanManageBranchConnections(
      principal,
      connection.organizationId,
      connection.branch,
    );
  }

  ensureSyncKindAllowed(syncKind: IntegrationSyncKind) {
    if (syncKind === IntegrationSyncKind.TEST_CONNECTION) {
      throw new ConflictException(
        'Use the dedicated test endpoint for TEST_CONNECTION jobs',
      );
    }
  }

  canManageOrganizationConnections(
    principal: AuthenticatedPrincipal,
    organizationId: string,
  ) {
    try {
      this.ensureCanManageOrganizationConnections(principal, organizationId);
      return true;
    } catch {
      return false;
    }
  }

  private getHighestRoleRank(roles: MembershipRole[]) {
    if (roles.length === 0) {
      return 0;
    }

    return Math.max(...roles.map((role) => ROLE_RANK[role] ?? 0));
  }
}
