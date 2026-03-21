import { IsOptional, IsString } from 'class-validator';

export class RejectPromotionDto {
  @IsString()
  rejectionReason!: string;

  @IsOptional()
  @IsString()
  decisionNotes?: string;
}
