import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { OrganizationsPolicy } from '../../domain/organizations.policy';
import { OrganizationsRepository } from '../../infrastructure/organizations.repository';
import { UpdateOrganizationStatusUseCase } from './update-organization-status.use-case';

describe('UpdateOrganizationStatusUseCase', () => {
  let useCase: UpdateOrganizationStatusUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOrganizationStatusUseCase,
        {
          provide: OrganizationsPolicy,
          useValue: {},
        },
        {
          provide: OrganizationsRepository,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<UpdateOrganizationStatusUseCase>(
      UpdateOrganizationStatusUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
