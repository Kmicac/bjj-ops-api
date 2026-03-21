import { Matches } from 'class-validator';
import { ISO_DATE_REGEX } from './class-time.constants';

export class GetClassSessionGapsQueryDto {
  @Matches(ISO_DATE_REGEX)
  fromDate!: string;

  @Matches(ISO_DATE_REGEX)
  toDate!: string;
}
