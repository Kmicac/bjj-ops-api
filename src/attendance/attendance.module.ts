import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { ListSessionAttendanceUseCase } from './application/use-cases/list-session-attendance.use-case';
import { RecordSessionAttendanceUseCase } from './application/use-cases/record-session-attendance.use-case';
import { AttendanceController } from './attendance.controller';
import { AttendancePolicy } from './domain/attendance.policy';
import { AttendanceRepository } from './infrastructure/attendance.repository';

@Module({
  imports: [AuthModule, AuditModule, BillingModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceRepository,
    AttendancePolicy,
    ListSessionAttendanceUseCase,
    RecordSessionAttendanceUseCase,
  ],
})
export class AttendanceModule {}
