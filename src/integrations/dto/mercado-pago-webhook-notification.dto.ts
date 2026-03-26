import {
  Transform,
  Type,
} from 'class-transformer';
import {
  IsBoolean,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

function transformOptionalString(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
}

class MercadoPagoWebhookDataDto {
  @Transform(({ value }) => String(value))
  @IsString()
  id!: string;
}

export class MercadoPagoWebhookNotificationDto {
  @Transform(({ value }) => transformOptionalString(value))
  @IsOptional()
  @IsString()
  id?: string;

  @Transform(({ value }) => transformOptionalString(value))
  @IsOptional()
  @IsString()
  type?: string;

  @Transform(({ value }) => transformOptionalString(value))
  @IsOptional()
  @IsString()
  action?: string;

  @Transform(({ value }) => transformOptionalString(value))
  @IsOptional()
  @IsString()
  api_version?: string;

  @IsOptional()
  @IsBoolean()
  live_mode?: boolean;

  @Transform(({ value }) => transformOptionalString(value))
  @IsOptional()
  @IsString()
  user_id?: string;

  @Transform(({ value }) => transformOptionalString(value))
  @IsOptional()
  @IsString()
  application_id?: string;

  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data!: MercadoPagoWebhookDataDto;
}
