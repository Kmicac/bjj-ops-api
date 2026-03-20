import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  MembershipRole,
  MembershipScopeType,
  MembershipStatus,
  OrganizationStatus,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const organizationSummarySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  defaultTimezone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;

type OrganizationSummary = Prisma.OrganizationGetPayload<{
  select: typeof organizationSummarySelect;
}>;

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  async createOrganizationWithFounderMembership(params: {
    actorUserId: string;
    actorMembershipId: string;
    name: string;
    slug: string;
    description?: string;
    defaultTimezone: string;
  }): Promise<OrganizationSummary> {
    const {
      actorMembershipId,
      actorUserId,
      defaultTimezone,
      description,
      name,
      slug,
    } = params;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name,
            slug,
            description,
            defaultTimezone,
            status: OrganizationStatus.ACTIVE,
          },
          select: organizationSummarySelect,
        });

        const membership = await tx.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: actorUserId,
            status: MembershipStatus.ACTIVE,
            scopeType: MembershipScopeType.ORGANIZATION_WIDE,
            roles: {
              create: [
                {
                  role: MembershipRole.MESTRE,
                },
              ],
            },
          },
          select: {
            id: true,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: organization.id,
            actorUserId,
            actorMembershipId: membership.id,
            action: 'organization.created',
            entityType: 'Organization',
            entityId: organization.id,
            metadata: {
              createdByMembershipId: actorMembershipId,
            },
          },
        });

        return organization;
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Organization slug already exists');
      }

      throw error;
    }
  }

  async listAccessibleOrganizations(params: {
    userId: string;
    skip: number;
    take: number;
  }) {
    const where = {
      deletedAt: null,
      memberships: {
        some: {
          userId: params.userId,
          status: MembershipStatus.ACTIVE,
        },
      },
    } satisfies Prisma.OrganizationWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: {
          createdAt: 'desc',
        },
        select: organizationSummarySelect,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { items, total };
  }

  async findActiveOrganizationById(
    organizationId: string,
  ): Promise<OrganizationSummary | null> {
    return this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: organizationSummarySelect,
    });
  }

  async getActiveOrganizationById(organizationId: string) {
    const organization = await this.findActiveOrganizationById(organizationId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async updateStatus(
    organizationId: string,
    status: OrganizationStatus,
  ) {
    const result = await this.prisma.organization.updateMany({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      data: {
        status,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Organization not found');
    }
  }
}
