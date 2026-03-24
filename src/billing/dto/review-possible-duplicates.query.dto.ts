import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from '../../generated/prisma/enums';
import { CURRENCY_REGEX, ISO_DATE_REGEX } from './billing.constants';

export class ReviewPossibleDuplicatesQueryDto {
  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  dateFrom?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  dateTo?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentKind)
  paymentKind?: PaymentKind;

  @IsOptional()
  @Matches(CURRENCY_REGEX)
  currency?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(14)
  windowDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number;
}
