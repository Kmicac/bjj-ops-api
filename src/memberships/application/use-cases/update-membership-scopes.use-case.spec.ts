import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { MembershipsPolicy } from '../../domain/memberships.policy';
import { MembershipsRepository } from '../../infrastructure/memberships.repository';
import { UpdateMembershipScopesUseCase } from './update-membership-scopes.use-case';

describe('UpdateMembershipScopesUseCase', () => {
  let useCase: UpdateMembershipScopesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateMembershipScopesUseCase,
        {
          provide: MembershipsPolicy,
          useValue: {},
        },
        {
          provide: MembershipsRepository,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<UpdateMembershipScopesUseCase>(
      UpdateMembershipScopesUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
