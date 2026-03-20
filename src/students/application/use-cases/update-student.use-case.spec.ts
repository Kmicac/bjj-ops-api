import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { StudentsPolicy } from '../../domain/students.policy';
import { StudentsRepository } from '../../infrastructure/students.repository';
import { UpdateStudentUseCase } from './update-student.use-case';

describe('UpdateStudentUseCase', () => {
  let useCase: UpdateStudentUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateStudentUseCase,
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

    useCase = module.get<UpdateStudentUseCase>(UpdateStudentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
