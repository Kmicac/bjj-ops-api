import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

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
  @IsString()
  currentBelt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  currentStripes?: number;
}
