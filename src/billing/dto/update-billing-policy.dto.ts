import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateBillingPolicyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  graceDays?: number;

  @IsOptional()
  @IsBoolean()
  restrictAttendanceWhenOverdue?: boolean;

  @IsOptional()
  @IsBoolean()
  restrictAppUsageWhenOverdue?: boolean;

  @IsOptional()
  @IsBoolean()
  allowFreeze?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  maxFreezeDaysPerYear?: number;

  @IsOptional()
  @IsBoolean()
  allowManualDiscounts?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPartialPayments?: boolean;
}
