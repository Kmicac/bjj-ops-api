import { IsOptional, Matches } from 'class-validator';
import { CURRENCY_REGEX, ISO_DATE_REGEX } from './billing.constants';

export class GetBillingSummaryQueryDto {
  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  dateFrom?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  dateTo?: string;

  @IsOptional()
  @Matches(CURRENCY_REGEX)
  currency?: string;
}
