import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG_REGEX)
  organizationSlug?: string;
}
