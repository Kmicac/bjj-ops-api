import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessControlService } from '../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../auth/authenticated-principal.interface';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import {
  MembershipRole,
  MembershipScopeType,
  MembershipStatus,
  UserStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly accessControl: AccessControlService,
  ) {}

  async invite(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    dto: InviteUserDto,
  ) {
    this.accessControl.ensureOrganizationRole(
      principal,
      organizationId,
      MembershipRole.ORG_ADMIN,
    );
    this.accessControl.ensureCanManageRoles(principal, dto.roles);

    const normalizedEmail = dto.email.trim().toLowerCase();
    const scope = await this.validateScope(organizationId, dto.scope);

    const existingMembership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        user: {
          email: normalizedEmail,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of the organization');
    }

    const invited = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email: normalizedEmail,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim(),
            status: UserStatus.INVITED,
          },
        }));

      const membership = await tx.organizationMembership.create({
        data: {
          organizationId,
          userId: user.id,
          status: MembershipStatus.INVITED,
          scopeType: scope.scopeType,
          primaryBranchId: scope.primaryBranchId,
          roles: {
            create: dto.roles.map((role) => ({
              role,
            })),
          },
          branchScopes:
            scope.scopeType === MembershipScopeType.SELECTED_BRANCHES
              ? {
                  create: scope.branchIds.map((branchId) => ({
                    branchId,
                  })),
                }
              : undefined,
        },
        include: {
          roles: true,
          branchScopes: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: principal.sub,
          actorMembershipId: principal.membershipId,
          action: 'user.invited',
          entityType: 'OrganizationMembership',
          entityId: membership.id,
          metadata: {
            invitedUserId: user.id,
            email: user.email,
            roles: dto.roles,
            scopeType: membership.scopeType,
            branchIds: membership.branchScopes.map(({ branchId }) => branchId),
          },
        },
      });

      return {
        user,
        membership,
      };
    });

    return {
      user: {
        id: invited.user.id,
        email: invited.user.email,
        firstName: invited.user.firstName,
        lastName: invited.user.lastName,
        phone: invited.user.phone,
        status: invited.user.status,
      },
      membership: {
        id: invited.membership.id,
        organizationId,
        status: invited.membership.status,
        assignedRoles: invited.membership.roles.map(({ role }) => role),
        scopeType: invited.membership.scopeType,
        branchIds: invited.membership.branchScopes.map(({ branchId }) => branchId),
        primaryBranchId: invited.membership.primaryBranchId,
      },
    };
  }

  private async validateScope(
    organizationId: string,
    scope: InviteUserDto['scope'],
  ) {
    if (scope.scopeType === MembershipScopeType.ORGANIZATION_WIDE) {
      return {
        scopeType: MembershipScopeType.ORGANIZATION_WIDE,
        branchIds: [] as string[],
        primaryBranchId: scope.primaryBranchId ?? null,
      };
    }

    if (!scope.branchIds?.length) {
      throw new ConflictException('branchIds are required for SELECTED_BRANCHES scope');
    }

    const uniqueBranchIds = [...new Set(scope.branchIds)];
    const branches = await this.prisma.branch.findMany({
      where: {
        organizationId,
        id: {
          in: uniqueBranchIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (branches.length !== uniqueBranchIds.length) {
      throw new NotFoundException('One or more branch scopes are invalid');
    }

    const primaryBranchId = scope.primaryBranchId ?? uniqueBranchIds[0];

    if (!uniqueBranchIds.includes(primaryBranchId)) {
      throw new ConflictException('primaryBranchId must be included in branchIds');
    }

    return {
      scopeType: MembershipScopeType.SELECTED_BRANCHES,
      branchIds: uniqueBranchIds,
      primaryBranchId,
    };
  }
}
