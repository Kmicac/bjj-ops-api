import { Test, TestingModule } from '@nestjs/testing';
import { StudentsPolicy } from '../../domain/students.policy';
import { StudentsRepository } from '../../infrastructure/students.repository';
import { ListStudentsByBranchUseCase } from './list-students-by-branch.use-case';

describe('ListStudentsByBranchUseCase', () => {
  let useCase: ListStudentsByBranchUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListStudentsByBranchUseCase,
        {
          provide: StudentsPolicy,
          useValue: {},
        },
        {
          provide: StudentsRepository,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<ListStudentsByBranchUseCase>(
      ListStudentsByBranchUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
