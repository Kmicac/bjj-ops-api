import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  MembershipRole,
  MembershipScopeType,
} from '../../generated/prisma/enums';

class MembershipScopeDto {
  @IsEnum(MembershipScopeType)
  scopeType!: MembershipScopeType;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  branchIds?: string[];

  @IsOptional()
  @IsString()
  primaryBranchId?: string;
}

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(MembershipRole, { each: true })
  roles!: MembershipRole[];

  @ValidateNested()
  @Type(() => MembershipScopeDto)
  scope!: MembershipScopeDto;
}
