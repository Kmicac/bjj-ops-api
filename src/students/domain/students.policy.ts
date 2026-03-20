import { Injectable } from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import { MembershipRole } from '../../generated/prisma/enums';

type BranchAccessTarget = {
  id: string;
  organizationId: string;
  headCoachMembershipId: string | null;
};

type StudentVisibilityTarget = {
  primaryBranch: BranchAccessTarget;
};

@Injectable()
export class StudentsPolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  ensureCanCreate(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureCanListByBranch(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureCanRead(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    student: StudentVisibilityTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, student.primaryBranch);
  }

  ensureCanUpdate(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    student: StudentVisibilityTarget,
    nextPrimaryBranch: BranchAccessTarget | null,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, student.primaryBranch);

    if (nextPrimaryBranch && nextPrimaryBranch.id !== student.primaryBranch.id) {
      this.ensureStaffBranchAccess(principal, organizationId, nextPrimaryBranch);
    }
  }

  private ensureStaffBranchAccess(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
    this.accessControl.ensureBranchAccess(principal, branch, MembershipRole.STAFF);
  }
}
