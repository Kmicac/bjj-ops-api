import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/authenticated-principal.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetOrganizationByIdUseCase } from './application/use-cases/get-organization-by-id.use-case';
import { ListOrganizationsUseCase } from './application/use-cases/list-organizations.use-case';
import { UpdateOrganizationStatusUseCase } from './application/use-cases/update-organization-status.use-case';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly getOrganizationByIdUseCase: GetOrganizationByIdUseCase,
    private readonly updateOrganizationStatusUseCase: UpdateOrganizationStatusUseCase,
  ) {}

  @Post()
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.createOrganizationUseCase.execute(principal, dto);
  }

  @Get()
  list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.listOrganizationsUseCase.execute(principal, pagination);
  }

  @Get(':organizationId')
  getById(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
  ) {
    return this.getOrganizationByIdUseCase.execute(principal, organizationId);
  }

  @Patch(':organizationId/status')
  updateStatus(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationStatusDto,
  ) {
    return this.updateOrganizationStatusUseCase.execute(
      principal,
      organizationId,
      dto,
    );
  }
}
