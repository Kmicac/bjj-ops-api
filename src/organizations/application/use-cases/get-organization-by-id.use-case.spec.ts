import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsPolicy } from '../../domain/organizations.policy';
import { OrganizationsRepository } from '../../infrastructure/organizations.repository';
import { GetOrganizationByIdUseCase } from './get-organization-by-id.use-case';

describe('GetOrganizationByIdUseCase', () => {
  let useCase: GetOrganizationByIdUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrganizationByIdUseCase,
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

    useCase = module.get<GetOrganizationByIdUseCase>(GetOrganizationByIdUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
