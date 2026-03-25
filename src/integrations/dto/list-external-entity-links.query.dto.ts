import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ExternalEntityType } from '../../generated/prisma/enums';

export class ListExternalEntityLinksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ExternalEntityType)
  entityType?: ExternalEntityType;

  @IsOptional()
  @IsString()
  internalEntityId?: string;

  @IsOptional()
  @IsString()
  externalEntityId?: string;
}
