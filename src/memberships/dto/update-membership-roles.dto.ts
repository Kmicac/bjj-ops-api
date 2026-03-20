import { ArrayMinSize, IsArray, IsEnum } from 'class-validator';
import { MembershipRole } from '../../generated/prisma/enums';

export class UpdateMembershipRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(MembershipRole, { each: true })
  roles!: MembershipRole[];
}
