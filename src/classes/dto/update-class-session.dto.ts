import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength, Matches } from 'class-validator';
import { ClassSessionStatus, ClassType } from '../../generated/prisma/enums';
import { ISO_DATE_REGEX } from './class-time.constants';

export class UpdateClassSessionDto {
  @IsOptional()
  @IsString()
  instructorMembershipId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsEnum(ClassType)
  classType?: ClassType;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number | null;

  @IsOptional()
  @IsEnum(ClassSessionStatus)
  status?: ClassSessionStatus;

  @IsOptional()
  @IsString()
  cancellationReason?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
