import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  IntegrationProvider,
  IntegrationScopeType,
  IntegrationStatus,
} from '../../generated/prisma/enums';

export class ListIntegrationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(IntegrationProvider)
  provider?: IntegrationProvider;

  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @IsOptional()
  @IsEnum(IntegrationScopeType)
  scopeType?: IntegrationScopeType;
}
