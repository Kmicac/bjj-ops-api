import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PromotionRank, PromotionTrack } from '../../generated/prisma/enums';

export class CreateStudentDto {
  @IsString()
  primaryBranchId!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsDateString()
  startedBjjAt?: string;

  @IsOptional()
  @IsDateString()
  joinedOrganizationAt?: string;

  @IsOptional()
  @IsEnum(PromotionTrack)
  promotionTrack?: PromotionTrack;

  @IsOptional()
  @IsEnum(PromotionRank)
  currentBelt?: PromotionRank;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  currentStripes?: number;
}
