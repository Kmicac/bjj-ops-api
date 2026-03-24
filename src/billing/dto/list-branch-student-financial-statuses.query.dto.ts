import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { STUDENT_FINANCIAL_STATUSES } from '../domain/student-financial-status';

export class ListBranchStudentFinancialStatusesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STUDENT_FINANCIAL_STATUSES)
  financialStatus?: (typeof STUDENT_FINANCIAL_STATUSES)[number];
}
