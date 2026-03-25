import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ExternalEntityType } from '../../generated/prisma/enums';

export class CreateExternalEntityLinkDto {
  @IsEnum(ExternalEntityType)
  entityType!: ExternalEntityType;

  @IsString()
  internalEntityId!: string;

  @IsString()
  externalEntityId!: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsObject()
  metadataJson?: Record<string, unknown>;
}
