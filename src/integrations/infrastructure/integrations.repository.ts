import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { IntegrationScopeType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const branchAccessSelect = {
  id: true,
  organizationId: true,
  headCoachMembershipId: true,
} satisfies Prisma.BranchSelect;

const integrationConnectionSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  provider: true,
  status: true,
  scopeType: true,
  displayName: true,
  lastSyncAt: true,
  lastSyncStatus: true,
  lastSyncError: true,
  createdByMembershipId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IntegrationConnectionSelect;

const integrationConnectionAccessSelect = {
  ...integrationConnectionSelect,
  configJson: true,
  branch: {
    select: branchAccessSelect,
  },
} satisfies Prisma.IntegrationConnectionSelect;

const integrationSyncJobSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  integrationConnectionId: true,
  provider: true,
  syncKind: true,
  status: true,
  startedAt: true,
  finishedAt: true,
  triggeredByMembershipId: true,
  summaryJson: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IntegrationSyncJobSelect;

const externalEntityLinkSelect = {
  id: true,
  organizationId: true,
  branchId: true,
  integrationConnectionId: true,
  provider: true,
  entityType: true,
  internalEntityId: true,
  externalEntityId: true,
  externalReference: true,
  metadataJson: true,
  createdByMembershipId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExternalEntityLinkSelect;

type IntegrationConnectionRecord = Prisma.IntegrationConnectionGetPayload<{
  select: typeof integrationConnectionSelect;
}>;

type IntegrationConnectionAccessRecord = Prisma.IntegrationConnectionGetPayload<{
  select: typeof integrationConnectionAccessSelect;
}>;

type IntegrationSyncJobRecord = Prisma.IntegrationSyncJobGetPayload<{
  select: typeof integrationSyncJobSelect;
}>;

type ExternalEntityLinkRecord = Prisma.ExternalEntityLinkGetPayload<{
  select: typeof externalEntityLinkSelect;
}>;

function toNullableJsonValue(value: Prisma.InputJsonValue | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? Prisma.JsonNull : value;
}

@Injectable()
export class IntegrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBranchAccessTarget(organizationId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        deletedAt: null,
      },
      select: branchAccessSelect,
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async getIntegrationConnectionManagementTarget(
    organizationId: string,
    integrationId: string,
  ): Promise<IntegrationConnectionAccessRecord> {
    const connection = await this.prisma.integrationConnection.findFirst({
      where: {
        id: integrationId,
        organizationId,
        deletedAt: null,
      },
      select: integrationConnectionAccessSelect,
    });

    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    return connection;
  }

  async createIntegrationConnection(params: {
    organizationId: string;
    branchId?: string | null;
    provider: Prisma.IntegrationConnectionCreateInput['provider'];
    status: Prisma.IntegrationConnectionCreateInput['status'];
    scopeType: Prisma.IntegrationConnectionCreateInput['scopeType'];
    displayName: string;
    configJson?: Prisma.InputJsonValue | null;
    createdByMembershipId: string;
  }): Promise<IntegrationConnectionRecord> {
    return this.prisma.integrationConnection.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId ?? null,
        provider: params.provider,
        status: params.status,
        scopeType: params.scopeType,
        displayName: params.displayName,
        configJson: toNullableJsonValue(params.configJson),
        createdByMembershipId: params.createdByMembershipId,
      },
      select: integrationConnectionSelect,
    });
  }

  async listIntegrationConnections(params: {
    organizationId: string;
    provider?: Prisma.IntegrationConnectionWhereInput['provider'];
    status?: Prisma.IntegrationConnectionWhereInput['status'];
    scopeType?: Prisma.IntegrationConnectionWhereInput['scopeType'];
    branchId?: string;
    branchIds?: string[];
    restrictToBranchLevel?: boolean;
    skip: number;
    take: number;
  }) {
    if (params.branchIds && params.branchIds.length === 0) {
      return {
        items: [] as IntegrationConnectionRecord[],
        total: 0,
      };
    }

    const where: Prisma.IntegrationConnectionWhereInput = {
      organizationId: params.organizationId,
      deletedAt: null,
      provider: params.provider,
      status: params.status,
      scopeType: params.scopeType,
    };

    if (params.restrictToBranchLevel) {
      where.scopeType = IntegrationScopeType.BRANCH;
    }

    if (params.branchId) {
      where.branchId = params.branchId;
    }

    if (params.branchIds) {
      where.branchId = {
        in: params.branchIds,
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.integrationConnection.findMany({
        where,
        orderBy: [{ displayName: 'asc' }, { createdAt: 'desc' }],
        skip: params.skip,
        take: params.take,
        select: integrationConnectionSelect,
      }),
      this.prisma.integrationConnection.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
  }

  async updateIntegrationConnection(params: {
    integrationId: string;
    displayName?: string;
    status?: Prisma.IntegrationConnectionUpdateInput['status'];
    configJson?: Prisma.InputJsonValue | null;
    hasConfigJsonUpdate: boolean;
  }): Promise<IntegrationConnectionRecord> {
    return this.prisma.integrationConnection.update({
      where: {
        id: params.integrationId,
      },
      data: {
        displayName: params.displayName,
        status: params.status,
        ...(params.hasConfigJsonUpdate
          ? {
              configJson: toNullableJsonValue(params.configJson),
            }
          : {}),
      },
      select: integrationConnectionSelect,
    });
  }

  async createCompletedSyncJob(params: {
    organizationId: string;
    branchId?: string | null;
    integrationConnectionId: string;
    provider: Prisma.IntegrationSyncJobCreateInput['provider'];
    syncKind: Prisma.IntegrationSyncJobCreateInput['syncKind'];
    status: Prisma.IntegrationSyncJobCreateInput['status'];
    startedAt: Date;
    finishedAt?: Date | null;
    triggeredByMembershipId?: string | null;
    summaryJson?: Prisma.InputJsonValue | null;
    errorMessage?: string | null;
  }): Promise<IntegrationSyncJobRecord> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.integrationSyncJob.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId ?? null,
          integrationConnectionId: params.integrationConnectionId,
          provider: params.provider,
          syncKind: params.syncKind,
          status: params.status,
          startedAt: params.startedAt,
          finishedAt: params.finishedAt ?? null,
          triggeredByMembershipId: params.triggeredByMembershipId ?? null,
          summaryJson: toNullableJsonValue(params.summaryJson),
          errorMessage: params.errorMessage ?? null,
        },
        select: integrationSyncJobSelect,
      });

      await tx.integrationConnection.update({
        where: {
          id: params.integrationConnectionId,
        },
        data: {
          lastSyncAt: params.finishedAt ?? params.startedAt,
          lastSyncStatus: params.status,
          lastSyncError: params.errorMessage ?? null,
        },
      });

      return job;
    });
  }

  async listIntegrationSyncJobs(params: {
    organizationId: string;
    integrationConnectionId: string;
    syncKind?: Prisma.IntegrationSyncJobWhereInput['syncKind'];
    status?: Prisma.IntegrationSyncJobWhereInput['status'];
    skip: number;
    take: number;
  }) {
    const where: Prisma.IntegrationSyncJobWhereInput = {
      organizationId: params.organizationId,
      integrationConnectionId: params.integrationConnectionId,
      syncKind: params.syncKind,
      status: params.status,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.integrationSyncJob.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: params.skip,
        take: params.take,
        select: integrationSyncJobSelect,
      }),
      this.prisma.integrationSyncJob.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
  }

  async createExternalEntityLink(params: {
    organizationId: string;
    branchId?: string | null;
    integrationConnectionId: string;
    provider: Prisma.ExternalEntityLinkCreateInput['provider'];
    entityType: Prisma.ExternalEntityLinkCreateInput['entityType'];
    internalEntityId: string;
    externalEntityId: string;
    externalReference?: string;
    metadataJson?: Prisma.InputJsonValue | null;
    createdByMembershipId?: string | null;
  }): Promise<ExternalEntityLinkRecord> {
    try {
      return await this.prisma.externalEntityLink.create({
        data: {
          organizationId: params.organizationId,
          branchId: params.branchId ?? null,
          integrationConnectionId: params.integrationConnectionId,
          provider: params.provider,
          entityType: params.entityType,
          internalEntityId: params.internalEntityId,
          externalEntityId: params.externalEntityId,
          externalReference: params.externalReference,
          metadataJson: toNullableJsonValue(params.metadataJson),
          createdByMembershipId: params.createdByMembershipId ?? null,
        },
        select: externalEntityLinkSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('External entity link already exists');
      }

      throw error;
    }
  }

  async listExternalEntityLinks(params: {
    organizationId: string;
    integrationConnectionId: string;
    entityType?: Prisma.ExternalEntityLinkWhereInput['entityType'];
    internalEntityId?: string;
    externalEntityId?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.ExternalEntityLinkWhereInput = {
      organizationId: params.organizationId,
      integrationConnectionId: params.integrationConnectionId,
      entityType: params.entityType,
      internalEntityId: params.internalEntityId,
      externalEntityId: params.externalEntityId,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.externalEntityLink.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: params.skip,
        take: params.take,
        select: externalEntityLinkSelect,
      }),
      this.prisma.externalEntityLink.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
  }
}
