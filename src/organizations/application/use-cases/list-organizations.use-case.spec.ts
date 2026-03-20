import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsPolicy } from '../../domain/organizations.policy';
import { OrganizationsRepository } from '../../infrastructure/organizations.repository';
import { ListOrganizationsUseCase } from './list-organizations.use-case';

describe('ListOrganizationsUseCase', () => {
  let useCase: ListOrganizationsUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListOrganizationsUseCase,
        {
          provide: OrganizationsPolicy,
          useValue: {},
        },
        {
          provide: OrganizationsRepository,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<ListOrganizationsUseCase>(ListOrganizationsUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
