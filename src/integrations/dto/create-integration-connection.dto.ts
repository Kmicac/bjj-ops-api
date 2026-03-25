import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import {
  IntegrationProvider,
  IntegrationScopeType,
  IntegrationStatus,
} from '../../generated/prisma/enums';

export class CreateIntegrationConnectionDto {
  @IsEnum(IntegrationProvider)
  provider!: IntegrationProvider;

  @IsEnum(IntegrationScopeType)
  scopeType!: IntegrationScopeType;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;
}
