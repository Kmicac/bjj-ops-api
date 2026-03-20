import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { BranchesPolicy } from '../../domain/branches.policy';
import { BranchesRepository } from '../../infrastructure/branches.repository';
import { UpdateBranchUseCase } from './update-branch.use-case';

describe('UpdateBranchUseCase', () => {
  let useCase: UpdateBranchUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateBranchUseCase,
        {
          provide: BranchesPolicy,
          useValue: {},
        },
        {
          provide: BranchesRepository,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<UpdateBranchUseCase>(UpdateBranchUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
