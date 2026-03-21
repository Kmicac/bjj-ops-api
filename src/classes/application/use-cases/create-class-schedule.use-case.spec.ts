import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { CreateClassScheduleUseCase } from './create-class-schedule.use-case';

describe('CreateClassScheduleUseCase', () => {
  let useCase: CreateClassScheduleUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateClassScheduleUseCase,
        {
          provide: ClassesPolicy,
          useValue: {},
        },
        {
          provide: ClassesRepository,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<CreateClassScheduleUseCase>(CreateClassScheduleUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
