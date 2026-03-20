import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { StudentsPolicy } from '../../domain/students.policy';
import { StudentsRepository } from '../../infrastructure/students.repository';
import { CreateStudentUseCase } from './create-student.use-case';

describe('CreateStudentUseCase', () => {
  let useCase: CreateStudentUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateStudentUseCase,
        {
          provide: StudentsPolicy,
          useValue: {},
        },
        {
          provide: StudentsRepository,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<CreateStudentUseCase>(CreateStudentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
