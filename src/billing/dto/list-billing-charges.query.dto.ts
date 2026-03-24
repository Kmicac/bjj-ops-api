import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import {
  BillingChargeStatus,
  BillingChargeType,
} from '../../generated/prisma/enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CURRENCY_REGEX, ISO_DATE_REGEX } from './billing.constants';

export class ListBillingChargesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  billingPlanId?: string;

  @IsOptional()
  @IsEnum(BillingChargeType)
  chargeType?: BillingChargeType;

  @IsOptional()
  @IsEnum(BillingChargeStatus)
  status?: BillingChargeStatus;

  @IsOptional()
  @Matches(CURRENCY_REGEX)
  currency?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  dateFrom?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  dateTo?: string;
}
