import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
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
import { ClassesPolicy } from './domain/classes.policy';
import { ClassesRepository } from './infrastructure/classes.repository';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ClassesController],
  providers: [
    ClassesRepository,
    ClassesPolicy,
    CreateClassScheduleUseCase,
    ListBranchClassSchedulesUseCase,
    UpdateClassScheduleUseCase,
    CreateClassSessionUseCase,
    CreateClassSessionFromScheduleUseCase,
    GenerateClassSessionsFromSchedulesUseCase,
    GenerateMissingClassSessionsFromSchedulesUseCase,
    ListBranchClassSessionsUseCase,
    UpdateClassSessionUseCase,
    GetBranchClassCalendarViewUseCase,
    GetBranchClassSessionGapsUseCase,
  ],
})
export class ClassesModule {}
