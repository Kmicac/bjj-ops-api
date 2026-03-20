import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class BranchPublicProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  shortBio?: string;

  @IsOptional()
  @IsString()
  publicEmail?: string;

  @IsOptional()
  @IsString()
  publicPhone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
