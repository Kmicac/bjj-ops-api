import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentPrincipal } from './current-principal.decorator';
import { BootstrapDto } from './dto/bootstrap.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedPrincipal } from './authenticated-principal.interface';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapDto, @Req() request: Request) {
    return this.authService.bootstrap(dto, request);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.authService.getCurrentPrincipal(principal);
  }
}
