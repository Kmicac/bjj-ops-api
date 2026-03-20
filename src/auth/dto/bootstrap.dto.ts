import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class BootstrapDto {
  @IsString()
  @MinLength(3)
  organizationName!: string;

  @IsString()
  @Matches(SLUG_REGEX)
  organizationSlug!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  organizationDescription?: string;

  @IsString()
  @MinLength(3)
  organizationTimezone!: string;

  @IsString()
  @MinLength(2)
  branchName!: string;

  @IsString()
  @Matches(SLUG_REGEX)
  branchSlug!: string;

  @IsString()
  @Length(2, 2)
  branchCountryCode!: string;

  @IsOptional()
  @IsString()
  branchRegion?: string;

  @IsString()
  @MinLength(2)
  branchCity!: string;

  @IsOptional()
  @IsString()
  branchAddressLine1?: string;

  @IsOptional()
  @IsString()
  branchAddressLine2?: string;

  @IsOptional()
  @IsString()
  branchPostalCode?: string;

  @IsString()
  @MinLength(3)
  branchTimezone!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(12)
  adminPassword!: string;

  @IsString()
  @MinLength(2)
  adminFirstName!: string;

  @IsString()
  @MinLength(2)
  adminLastName!: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;
}
