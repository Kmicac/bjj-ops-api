import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PromotionsRepository } from './promotions.repository';

describe('PromotionsRepository', () => {
  let repository: PromotionsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsRepository,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    repository = module.get<PromotionsRepository>(PromotionsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
