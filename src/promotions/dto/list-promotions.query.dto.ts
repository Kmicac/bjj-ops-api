import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PromotionRequestStatus } from '../../generated/prisma/enums';

export class ListPromotionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PromotionRequestStatus)
  status?: PromotionRequestStatus;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
