import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  IntegrationWebhookProcessingStatus,
  IntegrationWebhookValidationStatus,
} from '../../generated/prisma/enums';

function transformOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

export class ListIntegrationWebhookEventsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(IntegrationWebhookValidationStatus)
  validationStatus?: IntegrationWebhookValidationStatus;

  @IsOptional()
  @IsEnum(IntegrationWebhookProcessingStatus)
  processingStatus?: IntegrationWebhookProcessingStatus;

  @IsOptional()
  @IsString()
  notificationType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsBoolean()
  onlyRecoverable?: boolean;

  @IsOptional()
  @IsString()
  externalResourceId?: string;
}
