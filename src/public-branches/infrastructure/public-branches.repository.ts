import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { BranchStatus, OrganizationStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const publicSearchSelect = {
  id: true,
  name: true,
  slug: true,
  countryCode: true,
  region: true,
  city: true,
  timezone: true,
  publicProfile: {
    select: {
      displayName: true,
      shortBio: true,
      publicPhone: true,
      website: true,
    },
  },
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.BranchSelect;

const publicDetailSelect = {
  id: true,
  name: true,
  slug: true,
  countryCode: true,
  region: true,
  city: true,
  addressLine1: true,
  addressLine2: true,
  postalCode: true,
  timezone: true,
  publicProfile: true,
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  headCoachMembership: {
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} satisfies Prisma.BranchSelect;

@Injectable()
export class PublicBranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchPublishedBranches(params: {
    countryCode: string;
    city?: string;
    skip: number;
    take: number;
  }) {
    const where = {
      deletedAt: null,
      countryCode: params.countryCode,
      city: params.city
        ? {
            contains: params.city,
            mode: 'insensitive' as const,
          }
        : undefined,
      isPublicListed: true,
      status: BranchStatus.ACTIVE,
      organization: {
        deletedAt: null,
        status: OrganizationStatus.ACTIVE,
      },
      publicProfile: {
        isPublished: true,
      },
    } satisfies Prisma.BranchWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
        select: publicSearchSelect,
      }),
      this.prisma.branch.count({ where }),
    ]);

    return { items, total };
  }

  async getPublishedBranchDetail(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        deletedAt: null,
        isPublicListed: true,
        status: BranchStatus.ACTIVE,
        organization: {
          deletedAt: null,
          status: OrganizationStatus.ACTIVE,
        },
        publicProfile: {
          isPublished: true,
        },
      },
      select: publicDetailSelect,
    });

    if (!branch) {
      throw new NotFoundException('Public branch not found');
    }

    return branch;
  }
}
