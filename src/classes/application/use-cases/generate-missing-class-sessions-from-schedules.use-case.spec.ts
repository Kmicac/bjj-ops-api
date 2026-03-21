import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { GenerateMissingClassSessionsFromSchedulesUseCase } from './generate-missing-class-sessions-from-schedules.use-case';

describe('GenerateMissingClassSessionsFromSchedulesUseCase', () => {
  let useCase: GenerateMissingClassSessionsFromSchedulesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateMissingClassSessionsFromSchedulesUseCase,
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

    useCase = module.get<GenerateMissingClassSessionsFromSchedulesUseCase>(
      GenerateMissingClassSessionsFromSchedulesUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
