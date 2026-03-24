import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { BillingChargeType } from '../../generated/prisma/enums';
import { CURRENCY_REGEX, ISO_DATE_REGEX } from './billing.constants';

export class CreateBillingChargeDto {
  @IsOptional()
  @IsString()
  studentMembershipId?: string;

  @IsOptional()
  @IsString()
  billingPlanId?: string;

  @IsEnum(BillingChargeType)
  chargeType!: BillingChargeType;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  periodStart?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  periodEnd?: string;

  @Matches(ISO_DATE_REGEX)
  dueDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @Matches(CURRENCY_REGEX)
  currency!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  externalProvider?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;
}
