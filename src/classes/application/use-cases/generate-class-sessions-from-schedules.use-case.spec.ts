import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { GenerateClassSessionsFromSchedulesUseCase } from './generate-class-sessions-from-schedules.use-case';

describe('GenerateClassSessionsFromSchedulesUseCase', () => {
  let useCase: GenerateClassSessionsFromSchedulesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateClassSessionsFromSchedulesUseCase,
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

    useCase = module.get<GenerateClassSessionsFromSchedulesUseCase>(
      GenerateClassSessionsFromSchedulesUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
