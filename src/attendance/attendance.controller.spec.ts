import { Test, TestingModule } from '@nestjs/testing';
import { ListSessionAttendanceUseCase } from './application/use-cases/list-session-attendance.use-case';
import { RecordSessionAttendanceUseCase } from './application/use-cases/record-session-attendance.use-case';
import { AttendanceController } from './attendance.controller';

describe('AttendanceController', () => {
  let controller: AttendanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        {
          provide: ListSessionAttendanceUseCase,
          useValue: {},
        },
        {
          provide: RecordSessionAttendanceUseCase,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AttendanceController>(AttendanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
