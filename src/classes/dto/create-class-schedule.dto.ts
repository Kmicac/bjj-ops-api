import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { ClassType, Weekday } from '../../generated/prisma/enums';
import { HH_MM_REGEX } from './class-time.constants';

export class CreateClassScheduleDto {
  @IsString()
  instructorMembershipId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsEnum(ClassType)
  classType!: ClassType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(Weekday)
  weekday!: Weekday;

  @IsString()
  @Matches(HH_MM_REGEX)
  startTime!: string;

  @IsString()
  @Matches(HH_MM_REGEX)
  endTime!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
