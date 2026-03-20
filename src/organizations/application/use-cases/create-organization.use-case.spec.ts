import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsPolicy } from '../../domain/organizations.policy';
import { OrganizationsRepository } from '../../infrastructure/organizations.repository';
import { CreateOrganizationUseCase } from './create-organization.use-case';

describe('CreateOrganizationUseCase', () => {
  let useCase: CreateOrganizationUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrganizationUseCase,
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

    useCase = module.get<CreateOrganizationUseCase>(CreateOrganizationUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
