import { Test, TestingModule } from '@nestjs/testing';
import {
  PromotionRecommendation,
  PromotionRequestStatus,
  PromotionTrack,
  PromotionType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { PromotionListSortBy } from '../application/promotion-listing';
import { PromotionsRepository } from './promotions.repository';

describe('PromotionsRepository', () => {
  let repository: PromotionsRepository;
  let prismaService: {
    promotionRequest: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      promotionRequest: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsRepository,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<PromotionsRepository>(PromotionsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('returns empty results for explicit empty branch scopes', async () => {
    const result = await repository.listPromotions({
      organizationId: 'org_1',
      branchIds: [],
      skip: 0,
      take: 20,
    });

    expect(result).toEqual({
      items: [],
      total: 0,
    });
    expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    expect(prismaService.promotionRequest.findMany).not.toHaveBeenCalled();
    expect(prismaService.promotionRequest.count).not.toHaveBeenCalled();
  });

  it('keeps raw-query ordering for operational recommendation sorting', async () => {
    prismaService.$queryRaw
      .mockResolvedValueOnce([{ id: 'promo_2' }, { id: 'promo_1' }])
      .mockResolvedValueOnce([{ total: BigInt(2) }]);
    prismaService.promotionRequest.findMany.mockResolvedValue([
      {
        id: 'promo_1',
      },
      {
        id: 'promo_2',
      },
    ]);

    const result = await repository.listPromotions({
      organizationId: 'org_1',
      status: PromotionRequestStatus.PENDING_REVIEW,
      type: PromotionType.BELT,
      track: PromotionTrack.ADULT,
      recommendation: PromotionRecommendation.RECOMMEND,
      sortBy: PromotionListSortBy.STRONGEST_RECOMMENDATION_FIRST,
      skip: 0,
      take: 20,
    });

    expect(prismaService.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prismaService.promotionRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org_1',
          id: {
            in: ['promo_2', 'promo_1'],
          },
        },
      }),
    );
    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual([
      'promo_2',
      'promo_1',
    ]);
  });
});
