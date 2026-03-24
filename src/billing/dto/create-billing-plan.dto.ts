import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { BillingFrequency } from '../../generated/prisma/enums';
import { CURRENCY_REGEX } from './billing.constants';

export class CreateBillingPlanDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BillingFrequency)
  billingFrequency!: BillingFrequency;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @Matches(CURRENCY_REGEX)
  currency!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  enrollmentFeeAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
