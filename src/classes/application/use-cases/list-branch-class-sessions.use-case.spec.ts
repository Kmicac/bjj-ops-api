import { Test, TestingModule } from '@nestjs/testing';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { ListBranchClassSessionsUseCase } from './list-branch-class-sessions.use-case';

describe('ListBranchClassSessionsUseCase', () => {
  let useCase: ListBranchClassSessionsUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListBranchClassSessionsUseCase,
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

    useCase = module.get<ListBranchClassSessionsUseCase>(
      ListBranchClassSessionsUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
