import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PromotionRank, PromotionType } from '../../generated/prisma/enums';

export class CreatePromotionRequestDto {
  @IsEnum(PromotionType)
  type!: PromotionType;

  @IsOptional()
  @IsEnum(PromotionRank)
  targetBelt?: PromotionRank;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  targetStripes?: number;

  @IsOptional()
  @IsString()
  proposalNotes?: string;
}
