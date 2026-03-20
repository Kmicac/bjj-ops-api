import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import { MembershipRole } from '../../generated/prisma/enums';

type HeadCoachCandidate = {
  assignedRoles: MembershipRole[];
};

const ALLOWED_HEAD_COACH_ROLES = new Set<MembershipRole>([
  MembershipRole.MESTRE,
  MembershipRole.ORG_ADMIN,
  MembershipRole.ACADEMY_MANAGER,
  MembershipRole.INSTRUCTOR,
]);

@Injectable()
export class BranchesPolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  ensureCanCreate(principal: AuthenticatedPrincipal, organizationId: string) {
    this.accessControl.ensureOrganizationRole(
      principal,
      organizationId,
      MembershipRole.ORG_ADMIN,
    );
  }

  ensureCanList(principal: AuthenticatedPrincipal, organizationId: string) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
  }

  ensureCanUpdate(principal: AuthenticatedPrincipal, organizationId: string) {
    this.accessControl.ensureOrganizationRole(
      principal,
      organizationId,
      MembershipRole.ORG_ADMIN,
    );
  }

  ensureValidHeadCoachCandidate(candidate: HeadCoachCandidate | null) {
    if (!candidate) {
      throw new NotFoundException('Head coach membership not found for branch');
    }

    if (
      !candidate.assignedRoles.some((role) => ALLOWED_HEAD_COACH_ROLES.has(role))
    ) {
      throw new ConflictException(
        'Head coach must be an instructional or leadership membership',
      );
    }
  }
}
