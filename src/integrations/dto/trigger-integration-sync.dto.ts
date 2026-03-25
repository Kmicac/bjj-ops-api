import { IsEnum } from 'class-validator';
import { IntegrationSyncKind } from '../../generated/prisma/enums';

export class TriggerIntegrationSyncDto {
  @IsEnum(IntegrationSyncKind)
  syncKind!: IntegrationSyncKind;
}
