import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';
import { UpdateClassSessionUseCase } from './update-class-session.use-case';

describe('UpdateClassSessionUseCase', () => {
  let useCase: UpdateClassSessionUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateClassSessionUseCase,
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

    useCase = module.get<UpdateClassSessionUseCase>(UpdateClassSessionUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
