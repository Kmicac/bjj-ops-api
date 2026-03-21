import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { UpdateClassScheduleUseCase } from './update-class-schedule.use-case';

describe('UpdateClassScheduleUseCase', () => {
  let useCase: UpdateClassScheduleUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateClassScheduleUseCase,
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

    useCase = module.get<UpdateClassScheduleUseCase>(UpdateClassScheduleUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
