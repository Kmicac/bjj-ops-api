import { Type } from 'class-transformer';
import {
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

export class CreateStudentMembershipDto {
  @IsString()
  billingPlanId!: string;

  @IsOptional()
  @IsEnum(StudentMembershipStatus)
  status?: StudentMembershipStatus;

  @Matches(ISO_DATE_REGEX)
  startedAt!: string;

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
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
