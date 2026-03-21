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
import { ApprovePromotionUseCase } from './application/use-cases/approve-promotion.use-case';
import { CreatePromotionRequestUseCase } from './application/use-cases/create-promotion-request.use-case';
import { GetPromotionDetailUseCase } from './application/use-cases/get-promotion-detail.use-case';
import { GetPromotionCatalogUseCase } from './application/use-cases/get-promotion-catalog.use-case';
import { GetStudentPromotionContextUseCase } from './application/use-cases/get-student-promotion-context.use-case';
import { ListPromotionsUseCase } from './application/use-cases/list-promotions.use-case';
import { RejectPromotionUseCase } from './application/use-cases/reject-promotion.use-case';
import { UpsertPromotionEvaluationUseCase } from './application/use-cases/upsert-promotion-evaluation.use-case';
import { ApprovePromotionDto } from './dto/approve-promotion.dto';
import { CreatePromotionRequestDto } from './dto/create-promotion-request.dto';
import { ListPromotionsQueryDto } from './dto/list-promotions.query.dto';
import { RejectPromotionDto } from './dto/reject-promotion.dto';
import { UpsertPromotionEvaluationDto } from './dto/upsert-promotion-evaluation.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId')
export class PromotionsController {
  constructor(
    private readonly createPromotionRequestUseCase: CreatePromotionRequestUseCase,
    private readonly getPromotionCatalogUseCase: GetPromotionCatalogUseCase,
    private readonly listPromotionsUseCase: ListPromotionsUseCase,
    private readonly getPromotionDetailUseCase: GetPromotionDetailUseCase,
    private readonly getStudentPromotionContextUseCase: GetStudentPromotionContextUseCase,
    private readonly upsertPromotionEvaluationUseCase: UpsertPromotionEvaluationUseCase,
    private readonly approvePromotionUseCase: ApprovePromotionUseCase,
    private readonly rejectPromotionUseCase: RejectPromotionUseCase,
  ) {}

  @Post('students/:studentId/promotions')
  create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Body() dto: CreatePromotionRequestDto,
  ) {
    return this.createPromotionRequestUseCase.execute(
      principal,
      organizationId,
      studentId,
      dto,
    );
  }

  @Get('promotions/catalog')
  getCatalog(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
  ) {
    return this.getPromotionCatalogUseCase.execute(principal, organizationId);
  }

  @Get('promotions')
  list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Query() query: ListPromotionsQueryDto,
  ) {
    return this.listPromotionsUseCase.execute(principal, organizationId, query);
  }

  @Get('promotions/:promotionId')
  getDetail(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('promotionId') promotionId: string,
  ) {
    return this.getPromotionDetailUseCase.execute(
      principal,
      organizationId,
      promotionId,
    );
  }

  @Get('students/:studentId/promotion-context')
  getStudentPromotionContext(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.getStudentPromotionContextUseCase.execute(
      principal,
      organizationId,
      studentId,
    );
  }

  @Patch('promotions/:promotionId/evaluation')
  upsertEvaluation(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('promotionId') promotionId: string,
    @Body() dto: UpsertPromotionEvaluationDto,
  ) {
    return this.upsertPromotionEvaluationUseCase.execute(
      principal,
      organizationId,
      promotionId,
      dto,
    );
  }

  @Post('promotions/:promotionId/approve')
  approve(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('promotionId') promotionId: string,
    @Body() dto: ApprovePromotionDto,
  ) {
    return this.approvePromotionUseCase.execute(
      principal,
      organizationId,
      promotionId,
      dto,
    );
  }

  @Post('promotions/:promotionId/reject')
  reject(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('promotionId') promotionId: string,
    @Body() dto: RejectPromotionDto,
  ) {
    return this.rejectPromotionUseCase.execute(
      principal,
      organizationId,
      promotionId,
      dto,
    );
  }
}
