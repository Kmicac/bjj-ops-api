import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/authenticated-principal.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListSessionAttendanceUseCase } from './application/use-cases/list-session-attendance.use-case';
import { RecordSessionAttendanceUseCase } from './application/use-cases/record-session-attendance.use-case';
import { RecordSessionAttendanceDto } from './dto/record-session-attendance.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/branches/:branchId/class-sessions/:sessionId/attendance')
export class AttendanceController {
  constructor(
    private readonly listSessionAttendanceUseCase: ListSessionAttendanceUseCase,
    private readonly recordSessionAttendanceUseCase: RecordSessionAttendanceUseCase,
  ) {}

  @Get()
  listSessionAttendance(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.listSessionAttendanceUseCase.execute(
      principal,
      organizationId,
      branchId,
      sessionId,
    );
  }

  @Post()
  recordSessionAttendance(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: RecordSessionAttendanceDto,
  ) {
    return this.recordSessionAttendanceUseCase.execute(
      principal,
      organizationId,
      branchId,
      sessionId,
      dto,
    );
  }
}
