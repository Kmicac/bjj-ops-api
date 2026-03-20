import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { BranchesPolicy } from '../../domain/branches.policy';
import { BranchesRepository } from '../../infrastructure/branches.repository';
import { CreateBranchUseCase } from './create-branch.use-case';

describe('CreateBranchUseCase', () => {
  let useCase: CreateBranchUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBranchUseCase,
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

    useCase = module.get<CreateBranchUseCase>(CreateBranchUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
