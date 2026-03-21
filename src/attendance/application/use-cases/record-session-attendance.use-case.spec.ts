import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../../audit/audit.service';
import { AttendancePolicy } from '../../domain/attendance.policy';
import { AttendanceRepository } from '../../infrastructure/attendance.repository';
import { RecordSessionAttendanceUseCase } from './record-session-attendance.use-case';

describe('RecordSessionAttendanceUseCase', () => {
  let useCase: RecordSessionAttendanceUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordSessionAttendanceUseCase,
        {
          provide: AttendancePolicy,
          useValue: {},
        },
        {
          provide: AttendanceRepository,
          useValue: {},
        },
        {
          provide: AuditService,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<RecordSessionAttendanceUseCase>(
      RecordSessionAttendanceUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
