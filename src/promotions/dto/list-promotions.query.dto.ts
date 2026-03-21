import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  PromotionRank,
  PromotionRequestStatus,
  PromotionTrack,
  PromotionType,
} from '../../generated/prisma/enums';

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

  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

  @IsOptional()
  @IsEnum(PromotionTrack)
  track?: PromotionTrack;

  @IsOptional()
  @IsEnum(PromotionRank)
  targetBelt?: PromotionRank;

  @IsOptional()
  @IsString()
  proposedByMembershipId?: string;

  @IsOptional()
  @IsString()
  reviewedByMembershipId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
