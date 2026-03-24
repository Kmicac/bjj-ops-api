import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import {
  DiscountType,
  StudentMembershipStatus,
} from '../../generated/prisma/enums';
import { ISO_DATE_REGEX } from './billing.constants';

export class UpdateStudentMembershipDto {
  @IsOptional()
  @IsString()
  billingPlanId?: string;

  @IsOptional()
  @IsEnum(StudentMembershipStatus)
  status?: StudentMembershipStatus;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  startedAt?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  endedAt?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  nextBillingDate?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  freezeStartAt?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  freezeEndAt?: string;

  @IsOptional()
  @IsBoolean()
  clearFreezeSchedule?: boolean;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsBoolean()
  clearDiscount?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
