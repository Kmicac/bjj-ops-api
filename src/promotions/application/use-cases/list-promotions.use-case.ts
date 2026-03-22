import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import {
  MembershipScopeType,
  PromotionRequestStatus,
} from '../../../generated/prisma/enums';
import { PromotionListSortBy } from '../promotion-listing';
import { buildPendingPromotionComparisonSummary } from '../promotion-comparison';
import { ListPromotionsQueryDto } from '../../dto/list-promotions.query.dto';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';

@Injectable()
export class ListPromotionsUseCase {
  constructor(
    private readonly promotionsPolicy: PromotionsPolicy,
    private readonly promotionsRepository: PromotionsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    query: ListPromotionsQueryDto,
  ) {
    const requiresPendingQueueStatus =
      query.snapshotOutOfDate !== undefined ||
      query.pendingOlderThanDays !== undefined ||
      query.sortBy === PromotionListSortBy.SNAPSHOT_OUT_OF_DATE_FIRST;

    if (
      requiresPendingQueueStatus &&
      query.status &&
      query.status !== PromotionRequestStatus.PENDING_REVIEW
    ) {
      throw new BadRequestException(
        'snapshotOutOfDate, pendingOlderThanDays, and snapshotOutOfDateFirst sorting only support pending promotions',
      );
    }

    const status =
      query.status ??
      (requiresPendingQueueStatus
        ? PromotionRequestStatus.PENDING_REVIEW
        : undefined);

    const branch = query.branchId
      ? await this.promotionsRepository.getBranchAccessTarget(
          organizationId,
          query.branchId,
        )
      : null;

    this.promotionsPolicy.ensureCanList(principal, organizationId, branch);

    const { page, limit, skip, take } = buildPagination(query);
    const branchIds =
      branch?.id
        ? [branch.id]
        : principal.scopeType === MembershipScopeType.SELECTED_BRANCHES
          ? principal.branchIds
          : undefined;

    const { items, total } = await this.promotionsRepository.listPromotions({
      organizationId,
      status,
      studentId: query.studentId,
      type: query.type,
      track: query.track,
      targetBelt: query.targetBelt,
      proposedByMembershipId: query.proposedByMembershipId,
      reviewedByMembershipId: query.reviewedByMembershipId,
      snapshotOutOfDate: query.snapshotOutOfDate,
      recommendation: query.recommendation,
      pendingOlderThanDays: query.pendingOlderThanDays,
      sortBy: query.sortBy,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      branchIds,
      skip,
      take,
    });

    return {
      items: items.map((item) => ({
        ...item,
        comparisonSummary: buildPendingPromotionComparisonSummary({
          status: item.status,
          type: item.type,
          trackSnapshot: item.trackSnapshot,
          currentBeltSnapshot: item.currentBeltSnapshot,
          currentStripesSnapshot: item.currentStripesSnapshot,
          targetBelt: item.targetBelt,
          targetStripes: item.targetStripes,
          student: {
            promotionTrack: item.student.promotionTrack,
            currentBelt: item.student.currentBelt,
            currentStripes: item.student.currentStripes,
          },
        }),
      })),
      meta: {
        page,
        limit,
        total,
      },
    };
  }
}
