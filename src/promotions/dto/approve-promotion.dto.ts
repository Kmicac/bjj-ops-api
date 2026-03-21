import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ApprovePromotionDto {
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  decisionNotes?: string;
}
