import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationsRepository } from './organizations.repository';

describe('OrganizationsRepository', () => {
  let repository: OrganizationsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsRepository,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    repository = module.get<OrganizationsRepository>(OrganizationsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
