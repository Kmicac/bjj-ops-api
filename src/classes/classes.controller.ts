import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/authenticated-principal.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
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
import { CreateClassScheduleDto } from './dto/create-class-schedule.dto';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { CreateClassSessionFromScheduleDto } from './dto/create-class-session-from-schedule.dto';
import { GenerateClassSessionsDto } from './dto/generate-class-sessions.dto';
import { GetClassCalendarViewQueryDto } from './dto/get-class-calendar-view.query.dto';
import { GetClassSessionGapsQueryDto } from './dto/get-class-session-gaps.query.dto';
import { ListClassSessionsQueryDto } from './dto/list-class-sessions.query.dto';
import { UpdateClassScheduleDto } from './dto/update-class-schedule.dto';
import { UpdateClassSessionDto } from './dto/update-class-session.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/branches/:branchId')
export class ClassesController {
  constructor(
    private readonly createClassScheduleUseCase: CreateClassScheduleUseCase,
    private readonly listBranchClassSchedulesUseCase: ListBranchClassSchedulesUseCase,
    private readonly updateClassScheduleUseCase: UpdateClassScheduleUseCase,
    private readonly createClassSessionUseCase: CreateClassSessionUseCase,
    private readonly createClassSessionFromScheduleUseCase: CreateClassSessionFromScheduleUseCase,
    private readonly generateClassSessionsFromSchedulesUseCase: GenerateClassSessionsFromSchedulesUseCase,
    private readonly generateMissingClassSessionsFromSchedulesUseCase: GenerateMissingClassSessionsFromSchedulesUseCase,
    private readonly listBranchClassSessionsUseCase: ListBranchClassSessionsUseCase,
    private readonly updateClassSessionUseCase: UpdateClassSessionUseCase,
    private readonly getBranchClassCalendarViewUseCase: GetBranchClassCalendarViewUseCase,
    private readonly getBranchClassSessionGapsUseCase: GetBranchClassSessionGapsUseCase,
  ) {}

  @Post('class-schedules')
  createSchedule(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Body() dto: CreateClassScheduleDto,
  ) {
    return this.createClassScheduleUseCase.execute(
      principal,
      organizationId,
      branchId,
      dto,
    );
  }

  @Get('class-schedules')
  listSchedules(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.listBranchClassSchedulesUseCase.execute(
      principal,
      organizationId,
      branchId,
      pagination,
    );
  }

  @Patch('class-schedules/:scheduleId')
  updateSchedule(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateClassScheduleDto,
  ) {
    return this.updateClassScheduleUseCase.execute(
      principal,
      organizationId,
      branchId,
      scheduleId,
      dto,
    );
  }

  @Post('class-sessions')
  createSession(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Body() dto: CreateClassSessionDto,
  ) {
    return this.createClassSessionUseCase.execute(
      principal,
      organizationId,
      branchId,
      dto,
    );
  }

  @Post('class-schedules/:scheduleId/class-sessions')
  createSessionFromSchedule(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: CreateClassSessionFromScheduleDto,
  ) {
    return this.createClassSessionFromScheduleUseCase.execute(
      principal,
      organizationId,
      branchId,
      scheduleId,
      dto,
    );
  }

  @Post('class-sessions/generate')
  generateSessions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Body() dto: GenerateClassSessionsDto,
  ) {
    return this.generateClassSessionsFromSchedulesUseCase.execute(
      principal,
      organizationId,
      branchId,
      dto,
    );
  }

  @Post('class-sessions/generate-missing')
  generateMissingSessions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Body() dto: GenerateClassSessionsDto,
  ) {
    return this.generateMissingClassSessionsFromSchedulesUseCase.execute(
      principal,
      organizationId,
      branchId,
      dto,
    );
  }

  @Get('class-sessions')
  listSessions(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() query: ListClassSessionsQueryDto,
  ) {
    return this.listBranchClassSessionsUseCase.execute(
      principal,
      organizationId,
      branchId,
      query,
    );
  }

  @Get('class-calendar')
  getCalendarView(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() query: GetClassCalendarViewQueryDto,
  ) {
    return this.getBranchClassCalendarViewUseCase.execute(
      principal,
      organizationId,
      branchId,
      query,
    );
  }

  @Get('class-session-gaps')
  getSessionGaps(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() query: GetClassSessionGapsQueryDto,
  ) {
    return this.getBranchClassSessionGapsUseCase.execute(
      principal,
      organizationId,
      branchId,
      query,
    );
  }

  @Patch('class-sessions/:sessionId')
  updateSession(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateClassSessionDto,
  ) {
    return this.updateClassSessionUseCase.execute(
      principal,
      organizationId,
      branchId,
      sessionId,
      dto,
    );
  }
}
