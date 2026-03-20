import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { MembershipScopeType } from '../../generated/prisma/enums';

export class UpdateMembershipScopesDto {
  @IsEnum(MembershipScopeType)
  scopeType!: MembershipScopeType;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  branchIds?: string[];

  @IsOptional()
  @IsString()
  primaryBranchId?: string | null;
}
