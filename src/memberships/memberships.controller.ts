import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/authenticated-principal.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListMembersUseCase } from './application/use-cases/list-members.use-case';
import { UpdateMembershipRolesUseCase } from './application/use-cases/update-membership-roles.use-case';
import { UpdateMembershipScopesUseCase } from './application/use-cases/update-membership-scopes.use-case';
import { ListMembersQueryDto } from './dto/list-members.query.dto';
import { UpdateMembershipRolesDto } from './dto/update-membership-roles.dto';
import { UpdateMembershipScopesDto } from './dto/update-membership-scopes.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId')
export class MembershipsController {
  constructor(
    private readonly updateMembershipRolesUseCase: UpdateMembershipRolesUseCase,
    private readonly updateMembershipScopesUseCase: UpdateMembershipScopesUseCase,
    private readonly listMembersUseCase: ListMembersUseCase,
  ) {}

  @Put('memberships/:membershipId/roles')
  updateRoles(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMembershipRolesDto,
  ) {
    return this.updateMembershipRolesUseCase.execute(
      principal,
      organizationId,
      membershipId,
      dto,
    );
  }

  @Put('memberships/:membershipId/scopes')
  updateScopes(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMembershipScopesDto,
  ) {
    return this.updateMembershipScopesUseCase.execute(
      principal,
      organizationId,
      membershipId,
      dto,
    );
  }

  @Get('members')
  listMembers(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Query() query: ListMembersQueryDto,
  ) {
    return this.listMembersUseCase.execute(principal, organizationId, query);
  }
}
