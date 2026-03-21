import { Test, TestingModule } from '@nestjs/testing';
import { AttendancePolicy } from '../../domain/attendance.policy';
import { AttendanceRepository } from '../../infrastructure/attendance.repository';
import { ListSessionAttendanceUseCase } from './list-session-attendance.use-case';

describe('ListSessionAttendanceUseCase', () => {
  let useCase: ListSessionAttendanceUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSessionAttendanceUseCase,
        {
          provide: AttendancePolicy,
          useValue: {},
        },
        {
          provide: AttendanceRepository,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<ListSessionAttendanceUseCase>(
      ListSessionAttendanceUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
