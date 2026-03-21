import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '../../generated/prisma/enums';

export class SessionAttendanceEntryDto {
  @IsString()
  studentId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
