import { IsEnum, Matches } from 'class-validator';
import { ISO_DATE_REGEX } from './class-time.constants';

export enum ClassCalendarView {
  DAY = 'DAY',
  WEEK = 'WEEK',
}

export class GetClassCalendarViewQueryDto {
  @Matches(ISO_DATE_REGEX)
  startDate!: string;

  @IsEnum(ClassCalendarView)
  view: ClassCalendarView = ClassCalendarView.DAY;
}
