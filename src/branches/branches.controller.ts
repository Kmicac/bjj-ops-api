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
import { CreateBranchUseCase } from './application/use-cases/create-branch.use-case';
import { ListBranchesUseCase } from './application/use-cases/list-branches.use-case';
import { UpdateBranchUseCase } from './application/use-cases/update-branch.use-case';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/branches')
export class BranchesController {
  constructor(
    private readonly createBranchUseCase: CreateBranchUseCase,
    private readonly listBranchesUseCase: ListBranchesUseCase,
    private readonly updateBranchUseCase: UpdateBranchUseCase,
  ) {}

  @Post()
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.createBranchUseCase.execute(principal, organizationId, dto);
  }

  @Get()
  list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.listBranchesUseCase.execute(
      principal,
      organizationId,
      pagination,
    );
  }

  @Patch(':branchId')
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.updateBranchUseCase.execute(
      principal,
      organizationId,
      branchId,
      dto,
    );
  }
}
