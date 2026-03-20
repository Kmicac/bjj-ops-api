import type {
  MembershipRole,
  MembershipScopeType,
} from '../generated/prisma/enums';

export interface AccessTokenClaims {
  sub: string;
  organizationSlug: string;
  organizationId: string;
  membershipId: string;
  assignedRoles: MembershipRole[];
  scopeType: MembershipScopeType;
  branchIds: string[];
  primaryBranchId: string | null;
  email: string;
  type: 'access';
}
