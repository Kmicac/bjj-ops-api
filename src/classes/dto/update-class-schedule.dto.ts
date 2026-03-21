import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';
import { ClassType, Weekday } from '../../generated/prisma/enums';
import { HH_MM_REGEX } from './class-time.constants';

export class UpdateClassScheduleDto {
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
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Weekday)
  weekday?: Weekday;

  @IsOptional()
  @IsString()
  @Matches(HH_MM_REGEX)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(HH_MM_REGEX)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
