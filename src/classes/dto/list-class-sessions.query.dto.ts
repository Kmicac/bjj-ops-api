import { IsOptional, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ISO_DATE_REGEX } from './class-time.constants';

export class ListClassSessionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  fromDate?: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX)
  toDate?: string;
}
