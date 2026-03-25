import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import {
  MembershipRole,
  MembershipScopeType,
} from '../../generated/prisma/enums';
import { IntegrationsPolicy } from './integrations.policy';

function buildPrincipal(params: {
  assignedRoles: MembershipRole[];
  scopeType?: MembershipScopeType;
  branchIds?: string[];
}): AuthenticatedPrincipal {
  return {
    sub: 'user_1',
    email: 'admin@snp.local',
    type: 'access',
    organizationSlug: 'org-snp',
    organizationId: 'org_1',
    membershipId: 'membership_1',
    assignedRoles: params.assignedRoles,
    scopeType: params.scopeType ?? MembershipScopeType.SELECTED_BRANCHES,
    branchIds: params.branchIds ?? [],
    primaryBranchId: params.branchIds?.[0] ?? null,
  };
}

describe('IntegrationsPolicy', () => {
  let policy: IntegrationsPolicy;

  const branch = {
    id: 'branch_1',
    organizationId: 'org_1',
    headCoachMembershipId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntegrationsPolicy, AccessControlService],
    }).compile();

    policy = module.get<IntegrationsPolicy>(IntegrationsPolicy);
  });

  it('allows organization-level integration management for org admins with organization-wide scope', () => {
    const principal = buildPrincipal({
      assignedRoles: [MembershipRole.ORG_ADMIN],
      scopeType: MembershipScopeType.ORGANIZATION_WIDE,
    });

    expect(() =>
      policy.ensureCanManageOrganizationConnections(principal, 'org_1'),
    ).not.toThrow();
  });

  it('rejects organization-level integration management without organization-wide scope', () => {
    const principal = buildPrincipal({
      assignedRoles: [MembershipRole.ORG_ADMIN],
      branchIds: ['branch_1'],
    });

    expect(() =>
      policy.ensureCanManageOrganizationConnections(principal, 'org_1'),
    ).toThrow(ForbiddenException);
  });

  it('allows branch-level integration management for academy managers with branch access', () => {
    const principal = buildPrincipal({
      assignedRoles: [MembershipRole.ACADEMY_MANAGER],
      branchIds: ['branch_1'],
    });

    expect(() =>
      policy.ensureCanManageBranchConnections(principal, 'org_1', branch),
    ).not.toThrow();
  });

  it('rejects branch-level integration management for head coaches by default', () => {
    const principal = buildPrincipal({
      assignedRoles: [MembershipRole.HEAD_COACH],
      branchIds: ['branch_1'],
    });

    expect(() =>
      policy.ensureCanManageBranchConnections(principal, 'org_1', branch),
    ).toThrow(ForbiddenException);
  });
});
