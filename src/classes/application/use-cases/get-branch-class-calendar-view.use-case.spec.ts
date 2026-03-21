import { Test, TestingModule } from '@nestjs/testing';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { GetBranchClassCalendarViewUseCase } from './get-branch-class-calendar-view.use-case';

describe('GetBranchClassCalendarViewUseCase', () => {
  let useCase: GetBranchClassCalendarViewUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBranchClassCalendarViewUseCase,
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

    useCase = module.get<GetBranchClassCalendarViewUseCase>(
      GetBranchClassCalendarViewUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
