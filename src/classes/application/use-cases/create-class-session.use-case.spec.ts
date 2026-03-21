import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { CreateClassSessionUseCase } from './create-class-session.use-case';

describe('CreateClassSessionUseCase', () => {
  let useCase: CreateClassSessionUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateClassSessionUseCase,
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

    useCase = module.get<CreateClassSessionUseCase>(CreateClassSessionUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
