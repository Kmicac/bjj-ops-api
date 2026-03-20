import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { BranchStatus, MembershipStatus, OrganizationStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

type BranchPublicProfileInput = {
  displayName?: string;
  shortBio?: string;
  publicEmail?: string;
  publicPhone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
  isPublished?: boolean;
};

type CreateBranchInput = {
  organizationId: string;
  name: string;
  slug: string;
  countryCode: string;
  region?: string;
  city: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  timezone: string;
  isPublicListed: boolean;
  publicProfile?: BranchPublicProfileInput;
};

type UpdateBranchInput = {
  organizationId: string;
  branchId: string;
  name?: string;
  slug?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  timezone?: string;
  isPublicListed?: boolean;
  headCoachMembershipId?: string | null;
  publicProfile?: BranchPublicProfileInput;
};

const branchMutationSelect = {
  id: true,
  organizationId: true,
  name: true,
  slug: true,
  countryCode: true,
  region: true,
  city: true,
  addressLine1: true,
  addressLine2: true,
  postalCode: true,
  timezone: true,
  status: true,
  isPublicListed: true,
  headCoachMembershipId: true,
  createdAt: true,
  updatedAt: true,
  publicProfile: true,
} satisfies Prisma.BranchSelect;

const branchListSelect = {
  id: true,
  organizationId: true,
  name: true,
  slug: true,
  countryCode: true,
  region: true,
  city: true,
  addressLine1: true,
  addressLine2: true,
  postalCode: true,
  timezone: true,
  status: true,
  isPublicListed: true,
  headCoachMembership: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  publicProfile: {
    select: {
      displayName: true,
      isPublished: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BranchSelect;

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureBranchExists(organizationId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }

  async createBranch(input: CreateBranchInput) {
    try {
      return await this.prisma.branch.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          slug: input.slug,
          countryCode: input.countryCode,
          region: input.region,
          city: input.city,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          postalCode: input.postalCode,
          timezone: input.timezone,
          status: BranchStatus.ACTIVE,
          isPublicListed: input.isPublicListed,
          publicProfile: input.publicProfile
            ? {
                create: {
                  organization: {
                    connect: {
                      id: input.organizationId,
                    },
                  },
                  ...this.mapPublicProfileInput(input.publicProfile),
                },
              }
            : undefined,
        },
        select: branchMutationSelect,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Branch slug already exists in the organization');
      }

      throw error;
    }
  }

  async listOrganizationBranches(params: {
    organizationId: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      deletedAt: null,
      organization: {
        deletedAt: null,
        status: {
          not: OrganizationStatus.CLOSED,
        },
      },
    } satisfies Prisma.BranchWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
        select: branchListSelect,
      }),
      this.prisma.branch.count({ where }),
    ]);

    return { items, total };
  }

  async findHeadCoachCandidate(params: {
    organizationId: string;
    membershipId: string;
    branchId: string;
  }) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        id: params.membershipId,
        organizationId: params.organizationId,
        status: MembershipStatus.ACTIVE,
        OR: [
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
        ],
      },
      select: {
        roles: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    return {
      assignedRoles: membership.roles.map(({ role }) => role),
    };
  }

  async updateBranch(input: UpdateBranchInput) {
    try {
      return await this.prisma.branch.update({
        where: { id: input.branchId },
        data: {
          name: input.name,
          slug: input.slug,
          countryCode: input.countryCode,
          region: input.region,
          city: input.city,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          postalCode: input.postalCode,
          timezone: input.timezone,
          isPublicListed: input.isPublicListed,
          headCoachMembershipId: input.headCoachMembershipId,
          publicProfile: input.publicProfile
            ? {
                upsert: {
                  create: {
                    organization: {
                      connect: {
                        id: input.organizationId,
                      },
                    },
                    ...this.mapPublicProfileInput(input.publicProfile),
                  },
                  update: this.mapPublicProfileInput(input.publicProfile),
                },
              }
            : undefined,
        },
        select: branchMutationSelect,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Branch slug already exists in the organization');
      }

      throw error;
    }
  }

  private mapPublicProfileInput(input: BranchPublicProfileInput) {
    return {
      displayName: input.displayName,
      shortBio: input.shortBio,
      publicEmail: input.publicEmail,
      publicPhone: input.publicPhone,
      whatsapp: input.whatsapp,
      instagram: input.instagram,
      facebook: input.facebook,
      youtube: input.youtube,
      tiktok: input.tiktok,
      website: input.website,
      isPublished: input.isPublished,
    };
  }
}
