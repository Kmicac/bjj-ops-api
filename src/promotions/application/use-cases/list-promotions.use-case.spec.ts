import { Test, TestingModule } from '@nestjs/testing';
import {
  MembershipScopeType,
  PromotionRank,
  PromotionRequestStatus,
  PromotionTrack,
  PromotionType,
} from '../../../generated/prisma/enums';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';
import { ListPromotionsUseCase } from './list-promotions.use-case';

describe('ListPromotionsUseCase', () => {
  let useCase: ListPromotionsUseCase;
  let promotionsPolicy: {
    ensureCanList: jest.Mock;
  };
  let promotionsRepository: {
    listPromotions: jest.Mock;
    getBranchAccessTarget: jest.Mock;
  };

  beforeEach(async () => {
    promotionsPolicy = {
      ensureCanList: jest.fn(),
    };
    promotionsRepository = {
      listPromotions: jest.fn(),
      getBranchAccessTarget: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListPromotionsUseCase,
        { provide: PromotionsPolicy, useValue: promotionsPolicy },
        { provide: PromotionsRepository, useValue: promotionsRepository },
      ],
    }).compile();

    useCase = module.get<ListPromotionsUseCase>(ListPromotionsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('adds a comparison summary for pending promotions only', async () => {
    const principal = {
      sub: 'user_1',
      membershipId: 'mem_1',
      organizationId: 'org_1',
      scopeType: MembershipScopeType.ORGANIZATION_WIDE,
      branchIds: [],
      assignedRoles: [],
      effectiveRoles: [],
    } as any;

    promotionsRepository.listPromotions.mockResolvedValue({
      items: [
        {
          id: 'promo_pending',
          organizationId: 'org_1',
          branchId: 'branch_1',
          studentId: 'student_1',
          type: PromotionType.STRIPE,
          status: PromotionRequestStatus.PENDING_REVIEW,
          trackSnapshot: PromotionTrack.ADULT,
          currentBeltSnapshot: PromotionRank.ADULT_BLUE,
          currentStripesSnapshot: 2,
          targetBelt: null,
          targetStripes: 3,
          effectiveDate: null,
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
          student: {
            id: 'student_1',
            firstName: 'Helena',
            lastName: 'Silva',
            promotionTrack: PromotionTrack.ADULT,
            currentBelt: PromotionRank.ADULT_BLUE,
            currentStripes: 2,
          },
          evaluation: {
            recommendation: 'RECOMMEND',
            updatedAt: new Date('2026-02-02T00:00:00.000Z'),
          },
        },
        {
          id: 'promo_approved',
          organizationId: 'org_1',
          branchId: 'branch_1',
          studentId: 'student_2',
          type: PromotionType.BELT,
          status: PromotionRequestStatus.APPROVED,
          trackSnapshot: PromotionTrack.ADULT,
          currentBeltSnapshot: PromotionRank.ADULT_WHITE,
          currentStripesSnapshot: 4,
          targetBelt: PromotionRank.ADULT_BLUE,
          targetStripes: null,
          effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
          createdAt: new Date('2025-12-20T00:00:00.000Z'),
          student: {
            id: 'student_2',
            firstName: 'Marcos',
            lastName: 'Lima',
            promotionTrack: PromotionTrack.ADULT,
            currentBelt: PromotionRank.ADULT_BLUE,
            currentStripes: 0,
          },
          evaluation: {
            recommendation: 'STRONGLY_RECOMMEND',
            updatedAt: new Date('2025-12-22T00:00:00.000Z'),
          },
        },
      ],
      total: 2,
    });

    const result = await useCase.execute(principal, 'org_1', {});

    expect(promotionsPolicy.ensureCanList).toHaveBeenCalledWith(
      principal,
      'org_1',
      null,
    );
    expect(result.items[0].comparisonSummary).toEqual({
      fromSnapshot: {
        track: PromotionTrack.ADULT,
        trackLabel: 'Adult / Juvenile',
        belt: PromotionRank.ADULT_BLUE,
        beltLabel: 'Adult Blue',
        stripes: 2,
      },
      currentState: {
        track: PromotionTrack.ADULT,
        trackLabel: 'Adult / Juvenile',
        belt: PromotionRank.ADULT_BLUE,
        beltLabel: 'Adult Blue',
        stripes: 2,
      },
      requestedState: {
        track: PromotionTrack.ADULT,
        trackLabel: 'Adult / Juvenile',
        belt: PromotionRank.ADULT_BLUE,
        beltLabel: 'Adult Blue',
        stripes: 3,
      },
      snapshotOutOfDate: false,
      deltas: {
        snapshotVsCurrent: {
          changesTrack: false,
          changesBelt: false,
          changesStripes: false,
        },
        requestedVsCurrent: {
          changesTrack: false,
          changesBelt: false,
          changesStripes: true,
        },
      },
    });
    expect(result.items[1].comparisonSummary).toBeNull();
  });
});
