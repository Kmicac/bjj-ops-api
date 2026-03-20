import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BranchPublicProfileDto } from './branch-public-profile.dto';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateBranchDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(SLUG_REGEX)
  slug!: string;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsString()
  @MinLength(2)
  city!: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsString()
  @MinLength(3)
  timezone!: string;

  @IsOptional()
  @IsBoolean()
  isPublicListed?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BranchPublicProfileDto)
  publicProfile?: BranchPublicProfileDto;
}
