import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateOrganizationDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  @Matches(SLUG_REGEX)
  slug!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsString()
  @MinLength(3)
  defaultTimezone!: string;
}
