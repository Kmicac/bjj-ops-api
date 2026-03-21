import { Test, TestingModule } from '@nestjs/testing';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { ListBranchClassSchedulesUseCase } from './list-branch-class-schedules.use-case';

describe('ListBranchClassSchedulesUseCase', () => {
  let useCase: ListBranchClassSchedulesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListBranchClassSchedulesUseCase,
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

    useCase = module.get<ListBranchClassSchedulesUseCase>(
      ListBranchClassSchedulesUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
