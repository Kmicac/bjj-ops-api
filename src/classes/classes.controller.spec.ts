import { Test, TestingModule } from '@nestjs/testing';
import { CreateClassScheduleUseCase } from './application/use-cases/create-class-schedule.use-case';
import { CreateClassSessionUseCase } from './application/use-cases/create-class-session.use-case';
import { CreateClassSessionFromScheduleUseCase } from './application/use-cases/create-class-session-from-schedule.use-case';
import { GenerateClassSessionsFromSchedulesUseCase } from './application/use-cases/generate-class-sessions-from-schedules.use-case';
import { GenerateMissingClassSessionsFromSchedulesUseCase } from './application/use-cases/generate-missing-class-sessions-from-schedules.use-case';
import { GetBranchClassCalendarViewUseCase } from './application/use-cases/get-branch-class-calendar-view.use-case';
import { GetBranchClassSessionGapsUseCase } from './application/use-cases/get-branch-class-session-gaps.use-case';
import { ListBranchClassSchedulesUseCase } from './application/use-cases/list-branch-class-schedules.use-case';
import { ListBranchClassSessionsUseCase } from './application/use-cases/list-branch-class-sessions.use-case';
import { UpdateClassScheduleUseCase } from './application/use-cases/update-class-schedule.use-case';
import { UpdateClassSessionUseCase } from './application/use-cases/update-class-session.use-case';
import { ClassesController } from './classes.controller';

describe('ClassesController', () => {
  let controller: ClassesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: CreateClassScheduleUseCase,
          useValue: {},
        },
        {
          provide: ListBranchClassSchedulesUseCase,
          useValue: {},
        },
        {
          provide: UpdateClassScheduleUseCase,
          useValue: {},
        },
        {
          provide: CreateClassSessionUseCase,
          useValue: {},
        },
        {
          provide: CreateClassSessionFromScheduleUseCase,
          useValue: {},
        },
        {
          provide: GenerateClassSessionsFromSchedulesUseCase,
          useValue: {},
        },
        {
          provide: GenerateMissingClassSessionsFromSchedulesUseCase,
          useValue: {},
        },
        {
          provide: ListBranchClassSessionsUseCase,
          useValue: {},
        },
        {
          provide: UpdateClassSessionUseCase,
          useValue: {},
        },
        {
          provide: GetBranchClassCalendarViewUseCase,
          useValue: {},
        },
        {
          provide: GetBranchClassSessionGapsUseCase,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ClassesController>(ClassesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
