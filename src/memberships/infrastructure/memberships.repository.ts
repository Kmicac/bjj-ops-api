import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { MembershipScopeType, MembershipStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const membershipSummarySelect = {
  id: true,
  organizationId: true,
  status: true,
  scopeType: true,
  primaryBranchId: true,
  roles: {
    select: {
      role: true,
    },
  },
  branchScopes: {
    select: {
      branchId: true,
    },
  },
} satisfies Prisma.OrganizationMembershipSelect;

const membershipListSelect = {
  id: true,
  organizationId: true,
  status: true,
  scopeType: true,
  primaryBranchId: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
    },
  },
  roles: {
    select: {
      role: true,
    },
  },
  branchScopes: {
    select: {
      branchId: true,
    },
  },
} satisfies Prisma.OrganizationMembershipSelect;

@Injectable()
export class MembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMembershipManagementTarget(
    organizationId: string,
    membershipId: string,
  ) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
      select: {
        id: true,
        roles: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return {
      id: membership.id,
      assignedRoles: membership.roles.map(({ role }) => role),
    };
  }

  async replaceMembershipRoles(params: {
    organizationId: string;
    membershipId: string;
    roles: Prisma.Enumerable<Prisma.MembershipRoleAssignmentCreateManyInput>;
  }) {
    await this.prisma.$transaction(async (tx) => {
      await tx.membershipRoleAssignment.deleteMany({
        where: {
          membershipId: params.membershipId,
        },
      });

      await tx.membershipRoleAssignment.createMany({
        data: params.roles,
      });
    });
  }

  async replaceMembershipScopes(params: {
    membershipId: string;
    scopeType: MembershipScopeType;
    primaryBranchId: string | null;
    branchIds: string[];
  }) {
    await this.prisma.$transaction(async (tx) => {
      await tx.membershipBranchScope.deleteMany({
        where: {
          membershipId: params.membershipId,
        },
      });

      await tx.organizationMembership.update({
        where: {
          id: params.membershipId,
        },
        data: {
          scopeType: params.scopeType,
          primaryBranchId: params.primaryBranchId,
          branchScopes:
            params.scopeType === MembershipScopeType.SELECTED_BRANCHES
              ? {
                  create: params.branchIds.map((branchId) => ({
                    branchId,
                  })),
                }
              : undefined,
        },
      });
    });
  }

  async getMembershipSummary(organizationId: string, membershipId: string) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
      select: membershipSummarySelect,
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return {
      id: membership.id,
      organizationId: membership.organizationId,
      status: membership.status,
      scopeType: membership.scopeType,
      primaryBranchId: membership.primaryBranchId,
      assignedRoles: membership.roles.map(({ role }) => role),
      branchIds: membership.branchScopes.map(({ branchId }) => branchId),
    };
  }

  async getBranchAccessTarget(organizationId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        headCoachMembershipId: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async findExistingBranchIds(organizationId: string, branchIds: string[]) {
    if (!branchIds.length) {
      return [];
    }

    const branches = await this.prisma.branch.findMany({
      where: {
        organizationId,
        id: {
          in: branchIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return branches.map(({ id }) => id);
  }

  async listMembers(params: {
    organizationId: string;
    branchId?: string;
    status?: MembershipStatus;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      status: params.status,
      OR: params.branchId
        ? [
            {
              primaryBranchId: params.branchId,
            },
            {
              branchScopes: {
                some: {
                  branchId: params.branchId,
                },
              },
            },
          ]
        : undefined,
    } satisfies Prisma.OrganizationMembershipWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: {
          createdAt: 'desc',
        },
        select: membershipListSelect,
      }),
      this.prisma.organizationMembership.count({ where }),
    ]);

    return {
      items: items.map((membership) => ({
        id: membership.id,
        organizationId: membership.organizationId,
        status: membership.status,
        scopeType: membership.scopeType,
        primaryBranchId: membership.primaryBranchId,
        assignedRoles: membership.roles.map(({ role }) => role),
        branchIds: membership.branchScopes.map(({ branchId }) => branchId),
        user: membership.user,
      })),
      total,
    };
  }
}
