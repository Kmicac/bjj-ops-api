import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/authenticated-principal.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InviteUserDto } from './dto/invite-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  invite(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.usersService.invite(principal, organizationId, dto);
  }
}
