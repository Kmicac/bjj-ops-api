import { IsOptional, IsString, Matches } from 'class-validator';
import { ISO_DATE_REGEX } from './class-time.constants';

export class CreateClassSessionFromScheduleDto {
  @Matches(ISO_DATE_REGEX)
  scheduledDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
