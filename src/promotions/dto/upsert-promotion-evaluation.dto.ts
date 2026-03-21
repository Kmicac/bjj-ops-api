import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PromotionRecommendation } from '../../generated/prisma/enums';

export class UpsertPromotionEvaluationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  guardScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  controlScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  escapesDefenseScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  submissionsScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  tacticalUnderstandingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  attitudeDisciplineScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  commitmentConsistencyScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  teamworkRespectScore?: number;

  @IsOptional()
  @IsString()
  coachNotes?: string;

  @IsOptional()
  @IsEnum(PromotionRecommendation)
  recommendation?: PromotionRecommendation;
}
