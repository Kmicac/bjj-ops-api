import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  IntegrationSyncKind,
  IntegrationSyncStatus,
} from '../../generated/prisma/enums';

export class ListIntegrationSyncJobsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(IntegrationSyncKind)
  syncKind?: IntegrationSyncKind;

  @IsOptional()
  @IsEnum(IntegrationSyncStatus)
  status?: IntegrationSyncStatus;
}
