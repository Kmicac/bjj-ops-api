import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  PromotionRank,
  PromotionRecommendation,
  PromotionRequestStatus,
  PromotionTrack,
  PromotionType,
} from '../../generated/prisma/enums';
import { PromotionListSortBy } from '../application/promotion-listing';

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}

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
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  snapshotOutOfDate?: boolean;

  @IsOptional()
  @IsEnum(PromotionRecommendation)
  recommendation?: PromotionRecommendation;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pendingOlderThanDays?: number;

  @IsOptional()
  @IsEnum(PromotionListSortBy)
  sortBy?: PromotionListSortBy;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
