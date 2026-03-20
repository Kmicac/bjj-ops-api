import { Injectable } from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import { MembershipRole } from '../../generated/prisma/enums';

@Injectable()
export class OrganizationsPolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  ensureCanCreate(principal: AuthenticatedPrincipal) {
    this.accessControl.ensureOrganizationRole(
      principal,
      principal.organizationId,
      MembershipRole.MESTRE,
    );
  }

  ensureCanList(principal: AuthenticatedPrincipal) {
    this.accessControl.ensureOrganizationAccess(
      principal,
      principal.organizationId,
    );
  }

  ensureCanRead(
    principal: AuthenticatedPrincipal,
    organizationId: string,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
  }

  ensureCanUpdateStatus(
    principal: AuthenticatedPrincipal,
    organizationId: string,
  ) {
    this.accessControl.ensureOrganizationRole(
      principal,
      organizationId,
      MembershipRole.ORG_ADMIN,
    );
  }
}
