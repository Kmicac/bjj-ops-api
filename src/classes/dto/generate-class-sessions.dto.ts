import { IsDateString } from 'class-validator';

export class GenerateClassSessionsDto {
  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;
}
