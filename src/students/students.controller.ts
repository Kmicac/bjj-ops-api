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
import { CreateStudentUseCase } from './application/use-cases/create-student.use-case';
import { GetStudentDetailUseCase } from './application/use-cases/get-student-detail.use-case';
import { ListStudentsByBranchUseCase } from './application/use-cases/list-students-by-branch.use-case';
import { UpdateStudentUseCase } from './application/use-cases/update-student.use-case';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId')
export class StudentsController {
  constructor(
    private readonly createStudentUseCase: CreateStudentUseCase,
    private readonly listStudentsByBranchUseCase: ListStudentsByBranchUseCase,
    private readonly getStudentDetailUseCase: GetStudentDetailUseCase,
    private readonly updateStudentUseCase: UpdateStudentUseCase,
  ) {}

  @Post('students')
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateStudentDto,
  ) {
    return this.createStudentUseCase.execute(principal, organizationId, dto);
  }

  @Get('branches/:branchId/students')
  listByBranch(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.listStudentsByBranchUseCase.execute(
      principal,
      organizationId,
      branchId,
      pagination,
    );
  }

  @Get('students/:studentId')
  getDetail(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.getStudentDetailUseCase.execute(
      principal,
      organizationId,
      studentId,
    );
  }

  @Patch('students/:studentId')
  update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.updateStudentUseCase.execute(
      principal,
      organizationId,
      studentId,
      dto,
    );
  }
}
