import { IsEnum } from 'class-validator';
import { OrganizationStatus } from '../../generated/prisma/enums';

export class UpdateOrganizationStatusDto {
  @IsEnum(OrganizationStatus)
  status!: OrganizationStatus;
}
