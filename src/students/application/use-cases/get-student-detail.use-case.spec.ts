import { Test, TestingModule } from '@nestjs/testing';
import { StudentsPolicy } from '../../domain/students.policy';
import { StudentsRepository } from '../../infrastructure/students.repository';
import { GetStudentDetailUseCase } from './get-student-detail.use-case';

describe('GetStudentDetailUseCase', () => {
  let useCase: GetStudentDetailUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStudentDetailUseCase,
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

    useCase = module.get<GetStudentDetailUseCase>(GetStudentDetailUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
