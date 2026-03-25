import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { IntegrationStatus } from '../../generated/prisma/enums';

export class UpdateIntegrationConnectionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown> | null;
}
