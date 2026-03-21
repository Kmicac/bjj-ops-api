import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength, Matches } from 'class-validator';
import { ClassType } from '../../generated/prisma/enums';
import { ISO_DATE_REGEX } from './class-time.constants';

export class CreateClassSessionDto {
  @IsOptional()
  @IsString()
  classScheduleId?: string;

  @IsString()
  instructorMembershipId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsEnum(ClassType)
  classType!: ClassType;

  @Matches(ISO_DATE_REGEX)
  scheduledDate!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
