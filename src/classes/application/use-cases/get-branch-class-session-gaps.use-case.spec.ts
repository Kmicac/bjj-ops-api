import { Test, TestingModule } from '@nestjs/testing';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { GetBranchClassSessionGapsUseCase } from './get-branch-class-session-gaps.use-case';

describe('GetBranchClassSessionGapsUseCase', () => {
  let useCase: GetBranchClassSessionGapsUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBranchClassSessionGapsUseCase,
        {
          provide: ClassesPolicy,
          useValue: {},
        },
        {
          provide: ClassesRepository,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<GetBranchClassSessionGapsUseCase>(
      GetBranchClassSessionGapsUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
