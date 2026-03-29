import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  IntegrationScopeType,
  IntegrationStatus,
  IntegrationWebhookProcessingStatus,
  IntegrationWebhookValidationStatus,
} from '../../generated/prisma/enums';
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

const integrationWebhookEventSelect = {
  id: true,
  provider: true,
  organizationId: true,
  branchId: true,
  integrationConnectionId: true,
  deliveryId: true,
  notificationType: true,
  action: true,
  externalEventId: true,
  externalResourceId: true,
  validationStatus: true,
  validationError: true,
  processingStatus: true,
  processingError: true,
  payloadJson: true,
  resourceJson: true,
  queryJson: true,
  headersJson: true,
  receivedAt: true,
  processedAt: true,
  reprocessCount: true,
  lastReprocessedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IntegrationWebhookEventSelect;

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

type IntegrationWebhookEventRecord = Prisma.IntegrationWebhookEventGetPayload<{
  select: typeof integrationWebhookEventSelect;
}>;

function toNullableJsonValue(value: Prisma.InputJsonValue | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? Prisma.JsonNull : value;
}

function toStartOfUtcDay(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toEndOfUtcDay(value: string) {
  const date = new Date(value);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
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

  async getSingleActiveBranchConnectionByProvider(
    organizationId: string,
    branchId: string,
    provider: Prisma.IntegrationConnectionWhereInput['provider'],
  ): Promise<IntegrationConnectionAccessRecord> {
    const connections = await this.prisma.integrationConnection.findMany({
      where: {
        organizationId,
        branchId,
        provider,
        scopeType: IntegrationScopeType.BRANCH,
        status: IntegrationStatus.ACTIVE,
        deletedAt: null,
      },
      take: 2,
      orderBy: [{ updatedAt: 'desc' }],
      select: integrationConnectionAccessSelect,
    });

    if (connections.length === 0) {
      throw new NotFoundException(
        'Active branch integration connection not found',
      );
    }

    if (connections.length > 1) {
      throw new ConflictException(
        'Multiple active branch integration connections are configured for this provider',
      );
    }

    return connections[0];
  }

  async listActiveBranchConnectionsByProvider(
    provider: Prisma.IntegrationConnectionWhereInput['provider'],
  ): Promise<IntegrationConnectionAccessRecord[]> {
    return this.prisma.integrationConnection.findMany({
      where: {
        provider,
        scopeType: IntegrationScopeType.BRANCH,
        status: IntegrationStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: integrationConnectionAccessSelect,
    });
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

  async hasAnotherActiveBranchConnection(params: {
    organizationId: string;
    branchId: string;
    provider: Prisma.IntegrationConnectionWhereInput['provider'];
    excludeIntegrationId?: string;
  }) {
    const count = await this.prisma.integrationConnection.count({
      where: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        provider: params.provider,
        scopeType: IntegrationScopeType.BRANCH,
        status: IntegrationStatus.ACTIVE,
        deletedAt: null,
        ...(params.excludeIntegrationId
          ? {
              id: {
                not: params.excludeIntegrationId,
              },
            }
          : {}),
      },
    });

    return count > 0;
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

  async findSingleExternalEntityLinkByInternalEntity(params: {
    organizationId: string;
    integrationConnectionId: string;
    entityType: Prisma.ExternalEntityLinkWhereInput['entityType'];
    internalEntityId: string;
  }): Promise<ExternalEntityLinkRecord | null> {
    const links = await this.prisma.externalEntityLink.findMany({
      where: {
        organizationId: params.organizationId,
        integrationConnectionId: params.integrationConnectionId,
        entityType: params.entityType,
        internalEntityId: params.internalEntityId,
      },
      take: 2,
      orderBy: [{ createdAt: 'desc' }],
      select: externalEntityLinkSelect,
    });

    if (links.length > 1) {
      throw new ConflictException(
        'Multiple external entity links are configured for the same internal entity',
      );
    }

    return links[0] ?? null;
  }

  async findWebhookEventByProviderAndDeliveryId(
    provider: Prisma.IntegrationWebhookEventWhereInput['provider'],
    deliveryId: string,
  ): Promise<IntegrationWebhookEventRecord | null> {
    return this.prisma.integrationWebhookEvent.findFirst({
      where: {
        provider,
        deliveryId,
      },
      orderBy: [{ receivedAt: 'desc' }],
      select: integrationWebhookEventSelect,
    });
  }

  async createWebhookEvent(params: {
    provider: Prisma.IntegrationWebhookEventCreateInput['provider'];
    organizationId?: string | null;
    branchId?: string | null;
    integrationConnectionId?: string | null;
    deliveryId?: string | null;
    notificationType?: string | null;
    action?: string | null;
    externalEventId?: string | null;
    externalResourceId?: string | null;
    validationStatus: Prisma.IntegrationWebhookEventCreateInput['validationStatus'];
    validationError?: string | null;
    processingStatus?: Prisma.IntegrationWebhookEventCreateInput['processingStatus'];
    processingError?: string | null;
    payloadJson: Prisma.InputJsonValue;
    resourceJson?: Prisma.InputJsonValue | null;
    queryJson?: Prisma.InputJsonValue | null;
    headersJson?: Prisma.InputJsonValue | null;
    receivedAt?: Date;
    processedAt?: Date | null;
  }): Promise<IntegrationWebhookEventRecord> {
    return this.prisma.integrationWebhookEvent.create({
      data: {
        provider: params.provider,
        organizationId: params.organizationId ?? null,
        branchId: params.branchId ?? null,
        integrationConnectionId: params.integrationConnectionId ?? null,
        deliveryId: params.deliveryId ?? null,
        notificationType: params.notificationType ?? null,
        action: params.action ?? null,
        externalEventId: params.externalEventId ?? null,
        externalResourceId: params.externalResourceId ?? null,
        validationStatus: params.validationStatus,
        validationError: params.validationError ?? null,
        processingStatus:
          params.processingStatus ?? IntegrationWebhookProcessingStatus.RECEIVED,
        processingError: params.processingError ?? null,
        payloadJson: toNullableJsonValue(params.payloadJson) ?? Prisma.JsonNull,
        resourceJson: toNullableJsonValue(params.resourceJson),
        queryJson: toNullableJsonValue(params.queryJson),
        headersJson: toNullableJsonValue(params.headersJson),
        receivedAt: params.receivedAt ?? new Date(),
        processedAt: params.processedAt ?? null,
      },
      select: integrationWebhookEventSelect,
    });
  }

  async getWebhookEventById(eventId: string): Promise<IntegrationWebhookEventRecord> {
    const event = await this.prisma.integrationWebhookEvent.findUnique({
      where: {
        id: eventId,
      },
      select: integrationWebhookEventSelect,
    });

    if (!event) {
      throw new NotFoundException('Integration webhook event not found');
    }

    return event;
  }

  async updateWebhookEvent(params: {
    eventId: string;
    validationStatus?: IntegrationWebhookValidationStatus;
    validationError?: string | null;
    processingStatus?: IntegrationWebhookProcessingStatus;
    processingError?: string | null;
    resourceJson?: Prisma.InputJsonValue | null;
    processedAt?: Date | null;
  }): Promise<IntegrationWebhookEventRecord> {
    return this.prisma.integrationWebhookEvent.update({
      where: {
        id: params.eventId,
      },
      data: {
        validationStatus: params.validationStatus,
        validationError: params.validationError,
        processingStatus: params.processingStatus,
        processingError: params.processingError,
        resourceJson: toNullableJsonValue(params.resourceJson),
        processedAt: params.processedAt,
      },
      select: integrationWebhookEventSelect,
    });
  }

  async markWebhookEventReprocessed(params: {
    eventId: string;
    reprocessedAt: Date;
  }): Promise<IntegrationWebhookEventRecord> {
    return this.prisma.integrationWebhookEvent.update({
      where: {
        id: params.eventId,
      },
      data: {
        reprocessCount: {
          increment: 1,
        },
        lastReprocessedAt: params.reprocessedAt,
      },
      select: integrationWebhookEventSelect,
    });
  }

  async listWebhookEvents(params: {
    organizationId: string;
    integrationConnectionId: string;
    validationStatus?: IntegrationWebhookValidationStatus;
    processingStatus?: IntegrationWebhookProcessingStatus;
    notificationType?: string;
    externalResourceId?: string;
    dateFrom?: string;
    dateTo?: string;
    onlyRecoverable?: boolean;
    recoverableIgnoredReasons?: string[];
    skip: number;
    take: number;
  }) {
    const where: Prisma.IntegrationWebhookEventWhereInput = {
      organizationId: params.organizationId,
      integrationConnectionId: params.integrationConnectionId,
      validationStatus: params.validationStatus,
      processingStatus: params.processingStatus,
      notificationType: params.notificationType,
      externalResourceId: params.externalResourceId
        ? {
            contains: params.externalResourceId,
          }
        : undefined,
      receivedAt:
        params.dateFrom || params.dateTo
          ? {
              gte: params.dateFrom
                ? toStartOfUtcDay(params.dateFrom)
                : undefined,
              lte: params.dateTo ? toEndOfUtcDay(params.dateTo) : undefined,
            }
          : undefined,
    };

    if (params.onlyRecoverable) {
      where.validationStatus = IntegrationWebhookValidationStatus.VALID;
      where.OR = [
        {
          processingStatus: IntegrationWebhookProcessingStatus.RECEIVED,
        },
        {
          processingStatus: IntegrationWebhookProcessingStatus.FAILED,
        },
        {
          processingStatus: IntegrationWebhookProcessingStatus.IGNORED,
          processingError: params.recoverableIgnoredReasons?.length
            ? {
                in: params.recoverableIgnoredReasons,
              }
            : '__none__',
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.integrationWebhookEvent.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
        skip: params.skip,
        take: params.take,
        select: integrationWebhookEventSelect,
      }),
      this.prisma.integrationWebhookEvent.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
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
