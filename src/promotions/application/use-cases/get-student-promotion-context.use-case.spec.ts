import { Test, TestingModule } from '@nestjs/testing';
import { PromotionRank, PromotionRequestStatus, PromotionTrack, PromotionType } from '../../../generated/prisma/enums';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';
import { GetStudentPromotionContextUseCase } from './get-student-promotion-context.use-case';

describe('GetStudentPromotionContextUseCase', () => {
  let useCase: GetStudentPromotionContextUseCase;
  let promotionsPolicy: {
    ensureCanViewStudentContext: jest.Mock;
  };
  let promotionsRepository: {
    getPromotionContextForStudent: jest.Mock;
    computePromotionSignals: jest.Mock;
  };

  beforeEach(async () => {
    promotionsPolicy = {
      ensureCanViewStudentContext: jest.fn(),
    };
    promotionsRepository = {
      getPromotionContextForStudent: jest.fn(),
      computePromotionSignals: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStudentPromotionContextUseCase,
        {
          provide: PromotionsPolicy,
          useValue: promotionsPolicy,
        },
        {
          provide: PromotionsRepository,
          useValue: promotionsRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetStudentPromotionContextUseCase>(
      GetStudentPromotionContextUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('builds a comparison view between current state, last approval and pending request', async () => {
    const principal = {
      sub: 'user_1',
      membershipId: 'mem_1',
      organizationId: 'org_1',
      scopeType: 'ORGANIZATION_WIDE',
      branchIds: [],
      assignedRoles: [],
      effectiveRoles: [],
    } as any;

    promotionsRepository.getPromotionContextForStudent.mockResolvedValue({
      student: {
        id: 'student_1',
        firstName: 'Helena',
        lastName: 'Silva',
        promotionTrack: PromotionTrack.ADULT,
        currentBelt: PromotionRank.ADULT_BLUE,
        currentStripes: 2,
        startedBjjAt: new Date('2023-01-10T00:00:00.000Z'),
        joinedOrganizationAt: new Date('2024-01-10T00:00:00.000Z'),
        primaryBranch: {
          id: 'branch_1',
          organizationId: 'org_1',
          name: 'Alliance Centro',
          headCoachMembershipId: 'mem_2',
        },
      },
      lastApprovedPromotion: {
        id: 'promo_approved',
        branchId: 'branch_1',
        studentId: 'student_1',
        type: PromotionType.BELT,
        status: PromotionRequestStatus.APPROVED,
        trackSnapshot: PromotionTrack.ADULT,
        currentBeltSnapshot: PromotionRank.ADULT_WHITE,
        currentStripesSnapshot: 4,
        targetBelt: PromotionRank.ADULT_BLUE,
        targetStripes: null,
        effectiveDate: new Date('2025-01-10T00:00:00.000Z'),
        decisionAt: new Date('2025-01-11T00:00:00.000Z'),
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        proposedByMembershipId: 'mem_3',
        reviewedByMembershipId: 'mem_2',
      },
      totalApprovedPromotions: 3,
      currentPendingRequest: {
        id: 'promo_pending',
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
        decisionAt: null,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        proposedByMembershipId: 'mem_3',
        reviewedByMembershipId: null,
        evaluation: {
          recommendation: 'RECOMMEND',
          coachNotes: 'Ready for the next stripe',
          guardScore: 4,
          passingScore: 4,
          controlScore: 4,
          escapesDefenseScore: 4,
          submissionsScore: 3,
          tacticalUnderstandingScore: 4,
          attitudeDisciplineScore: 5,
          commitmentConsistencyScore: 5,
          teamworkRespectScore: 5,
          updatedAt: new Date('2026-02-02T00:00:00.000Z'),
        },
      },
      recentHistory: [],
    });
    promotionsRepository.computePromotionSignals.mockResolvedValue({
      classesSinceLastPromotion: 42,
      attendanceLast30Days: 8,
      attendanceLast90Days: 19,
      daysSinceLastPromotion: 70,
      approvedPromotionCount: 3,
    });

    const result = await useCase.execute(principal, 'org_1', 'student_1');

    expect(promotionsPolicy.ensureCanViewStudentContext).toHaveBeenCalledWith(
      principal,
      'org_1',
      expect.objectContaining({ id: 'branch_1' }),
    );
    expect(result.comparison.currentState).toEqual({
      track: PromotionTrack.ADULT,
      trackLabel: 'Adult / Juvenile',
      belt: PromotionRank.ADULT_BLUE,
      beltLabel: 'Adult Blue',
      stripes: 2,
    });
    expect(result.comparison.lastApprovedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 'promo_approved',
        type: PromotionType.BELT,
        resultingState: {
          track: PromotionTrack.ADULT,
          trackLabel: 'Adult / Juvenile',
          belt: PromotionRank.ADULT_BLUE,
          beltLabel: 'Adult Blue',
          stripes: 0,
        },
      }),
    );
    expect(result.comparison.pendingRequest).toEqual(
      expect.objectContaining({
        promotionId: 'promo_pending',
        requestedState: {
          track: PromotionTrack.ADULT,
          trackLabel: 'Adult / Juvenile',
          belt: PromotionRank.ADULT_BLUE,
          beltLabel: 'Adult Blue',
          stripes: 3,
        },
      }),
    );
    expect(result.comparison.deltas).toEqual({
      currentVsLastApproved: {
        changesTrack: false,
        changesBelt: false,
        changesStripes: true,
      },
      pendingVsCurrent: {
        changesTrack: false,
        changesBelt: false,
        changesStripes: true,
      },
      pendingVsLastApproved: {
        changesTrack: false,
        changesBelt: false,
        changesStripes: true,
      },
    });
    expect(result.competitionSummary).toBeNull();
  });
});
