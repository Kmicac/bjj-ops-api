import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { MembershipsPolicy } from '../../domain/memberships.policy';
import { MembershipsRepository } from '../../infrastructure/memberships.repository';
import { UpdateMembershipRolesUseCase } from './update-membership-roles.use-case';

describe('UpdateMembershipRolesUseCase', () => {
  let useCase: UpdateMembershipRolesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateMembershipRolesUseCase,
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

    useCase = module.get<UpdateMembershipRolesUseCase>(
      UpdateMembershipRolesUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
