import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import {
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from '../../generated/prisma/enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CURRENCY_REGEX, ISO_DATE_REGEX } from './billing.constants';

export class ListPaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;

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
  @Matches(ISO_DATE_REGEX)
  dateFrom?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  dateTo?: string;
}
