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
import { CreateBillingChargeUseCase } from './application/use-cases/create-billing-charge.use-case';
import { CreateBillingPlanUseCase } from './application/use-cases/create-billing-plan.use-case';
import { CreateMercadoPagoBillingChargePreferenceUseCase } from './application/use-cases/create-mercado-pago-billing-charge-preference.use-case';
import { CreateStudentMembershipUseCase } from './application/use-cases/create-student-membership.use-case';
import { GetBranchBillingPolicyUseCase } from './application/use-cases/get-branch-billing-policy.use-case';
import { GetBranchBillingSummaryUseCase } from './application/use-cases/get-branch-billing-summary.use-case';
import { GetStudentBillingContextUseCase } from './application/use-cases/get-student-billing-context.use-case';
import { GetStudentMembershipUseCase } from './application/use-cases/get-student-membership.use-case';
import { ListBillingPlansUseCase } from './application/use-cases/list-billing-plans.use-case';
import { ListBranchBillingChargesUseCase } from './application/use-cases/list-branch-billing-charges.use-case';
import { ListBranchPaymentsUseCase } from './application/use-cases/list-branch-payments.use-case';
import { ListBranchStudentFinancialStatusesUseCase } from './application/use-cases/list-branch-student-financial-statuses.use-case';
import { ListStudentBillingChargesUseCase } from './application/use-cases/list-student-billing-charges.use-case';
import { ListStudentPaymentsUseCase } from './application/use-cases/list-student-payments.use-case';
import { RecordGeneralIncomeUseCase } from './application/use-cases/record-general-income.use-case';
import { RecordManualStudentPaymentUseCase } from './application/use-cases/record-manual-student-payment.use-case';
import { ReviewPossibleDuplicatePaymentsUseCase } from './application/use-cases/review-possible-duplicate-payments.use-case';
import { UpdateBillingPlanUseCase } from './application/use-cases/update-billing-plan.use-case';
import { UpdateBranchBillingPolicyUseCase } from './application/use-cases/update-branch-billing-policy.use-case';
import { UpdateStudentMembershipUseCase } from './application/use-cases/update-student-membership.use-case';
import { CreateBillingChargeDto } from './dto/create-billing-charge.dto';
import { CreateBillingPlanDto } from './dto/create-billing-plan.dto';
import { CreateStudentMembershipDto } from './dto/create-student-membership.dto';
import { GetBillingSummaryQueryDto } from './dto/get-billing-summary.query.dto';
import { ListBillingChargesQueryDto } from './dto/list-billing-charges.query.dto';
import { ListBranchStudentFinancialStatusesQueryDto } from './dto/list-branch-student-financial-statuses.query.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.query.dto';
import { RecordGeneralIncomeDto } from './dto/record-general-income.dto';
import { RecordManualStudentPaymentDto } from './dto/record-manual-student-payment.dto';
import { ReviewPossibleDuplicatesQueryDto } from './dto/review-possible-duplicates.query.dto';
import { UpdateBillingPlanDto } from './dto/update-billing-plan.dto';
import { UpdateBillingPolicyDto } from './dto/update-billing-policy.dto';
import { UpdateStudentMembershipDto } from './dto/update-student-membership.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId')
export class BillingController {
  constructor(
    private readonly createBillingPlanUseCase: CreateBillingPlanUseCase,
    private readonly listBillingPlansUseCase: ListBillingPlansUseCase,
    private readonly updateBillingPlanUseCase: UpdateBillingPlanUseCase,
    private readonly createMercadoPagoBillingChargePreferenceUseCase: CreateMercadoPagoBillingChargePreferenceUseCase,
    private readonly createStudentMembershipUseCase: CreateStudentMembershipUseCase,
    private readonly getStudentMembershipUseCase: GetStudentMembershipUseCase,
    private readonly updateStudentMembershipUseCase: UpdateStudentMembershipUseCase,
    private readonly createBillingChargeUseCase: CreateBillingChargeUseCase,
    private readonly listStudentBillingChargesUseCase: ListStudentBillingChargesUseCase,
    private readonly listBranchBillingChargesUseCase: ListBranchBillingChargesUseCase,
    private readonly listBranchStudentFinancialStatusesUseCase: ListBranchStudentFinancialStatusesUseCase,
    private readonly recordManualStudentPaymentUseCase: RecordManualStudentPaymentUseCase,
    private readonly recordGeneralIncomeUseCase: RecordGeneralIncomeUseCase,
    private readonly listStudentPaymentsUseCase: ListStudentPaymentsUseCase,
    private readonly listBranchPaymentsUseCase: ListBranchPaymentsUseCase,
    private readonly getStudentBillingContextUseCase: GetStudentBillingContextUseCase,
    private readonly getBranchBillingPolicyUseCase: GetBranchBillingPolicyUseCase,
    private readonly updateBranchBillingPolicyUseCase: UpdateBranchBillingPolicyUseCase,
    private readonly reviewPossibleDuplicatePaymentsUseCase: ReviewPossibleDuplicatePaymentsUseCase,
    private readonly getBranchBillingSummaryUseCase: GetBranchBillingSummaryUseCase,
  ) {}

  @Post('branches/:branchId/billing-plans')
  createBillingPlan(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Body() dto: CreateBillingPlanDto,
  ) {
    return this.createBillingPlanUseCase.execute(
      principal,
      organizationId,
      branchId,
      dto,
    );
  }

  @Get('branches/:branchId/billing-plans')
  listBillingPlans(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.listBillingPlansUseCase.execute(
      principal,
      organizationId,
      branchId,
    );
  }

  @Patch('branches/:branchId/billing-plans/:planId')
  updateBillingPlan(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateBillingPlanDto,
  ) {
    return this.updateBillingPlanUseCase.execute(
      principal,
      organizationId,
      branchId,
      planId,
      dto,
    );
  }

  @Post('students/:studentId/membership')
  createStudentMembership(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Body() dto: CreateStudentMembershipDto,
  ) {
    return this.createStudentMembershipUseCase.execute(
      principal,
      organizationId,
      studentId,
      dto,
    );
  }

  @Get('students/:studentId/membership')
  getStudentMembership(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.getStudentMembershipUseCase.execute(
      principal,
      organizationId,
      studentId,
    );
  }

  @Patch('students/:studentId/membership')
  updateStudentMembership(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentMembershipDto,
  ) {
    return this.updateStudentMembershipUseCase.execute(
      principal,
      organizationId,
      studentId,
      dto,
    );
  }

  @Post('students/:studentId/billing-charges')
  createBillingCharge(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Body() dto: CreateBillingChargeDto,
  ) {
    return this.createBillingChargeUseCase.execute(
      principal,
      organizationId,
      studentId,
      dto,
    );
  }

  @Post('students/:studentId/billing-charges/:chargeId/mercado-pago/preference')
  createMercadoPagoBillingChargePreference(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Param('chargeId') chargeId: string,
  ) {
    return this.createMercadoPagoBillingChargePreferenceUseCase.execute(
      principal,
      organizationId,
      studentId,
      chargeId,
    );
  }

  @Get('students/:studentId/billing-charges')
  listStudentBillingCharges(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Query() query: ListBillingChargesQueryDto,
  ) {
    return this.listStudentBillingChargesUseCase.execute(
      principal,
      organizationId,
      studentId,
      query,
    );
  }

  @Get('branches/:branchId/billing-charges')
  listBranchBillingCharges(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() query: ListBillingChargesQueryDto,
  ) {
    return this.listBranchBillingChargesUseCase.execute(
      principal,
      organizationId,
      branchId,
      query,
    );
  }

  @Get('branches/:branchId/student-financial-statuses')
  listBranchStudentFinancialStatuses(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() query: ListBranchStudentFinancialStatusesQueryDto,
  ) {
    return this.listBranchStudentFinancialStatusesUseCase.execute(
      principal,
      organizationId,
      branchId,
      query,
    );
  }

  @Post('students/:studentId/payments/manual')
  recordManualStudentPayment(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Body() dto: RecordManualStudentPaymentDto,
  ) {
    return this.recordManualStudentPaymentUseCase.execute(
      principal,
      organizationId,
      studentId,
      dto,
    );
  }

  @Post('branches/:branchId/general-income')
  recordGeneralIncome(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Body() dto: RecordGeneralIncomeDto,
  ) {
    return this.recordGeneralIncomeUseCase.execute(
      principal,
      organizationId,
      branchId,
      dto,
    );
  }

  @Get('students/:studentId/payments')
  listStudentPayments(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.listStudentPaymentsUseCase.execute(
      principal,
      organizationId,
      studentId,
      query,
    );
  }

  @Get('branches/:branchId/payments')
  listBranchPayments(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.listBranchPaymentsUseCase.execute(
      principal,
      organizationId,
      branchId,
      query,
    );
  }

  @Get('students/:studentId/billing-context')
  getStudentBillingContext(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.getStudentBillingContextUseCase.execute(
      principal,
      organizationId,
      studentId,
    );
  }

  @Get('branches/:branchId/billing-policy')
  getBranchBillingPolicy(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.getBranchBillingPolicyUseCase.execute(
      principal,
      organizationId,
      branchId,
    );
  }

  @Patch('branches/:branchId/billing-policy')
  updateBranchBillingPolicy(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBillingPolicyDto,
  ) {
    return this.updateBranchBillingPolicyUseCase.execute(
      principal,
      organizationId,
      branchId,
      dto,
    );
  }

  @Get('branches/:branchId/payments/possible-duplicates')
  reviewPossibleDuplicatePayments(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() query: ReviewPossibleDuplicatesQueryDto,
  ) {
    return this.reviewPossibleDuplicatePaymentsUseCase.execute(
      principal,
      organizationId,
      branchId,
      query,
    );
  }

  @Get('branches/:branchId/billing-summary')
  getBranchBillingSummary(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Param('branchId') branchId: string,
    @Query() query: GetBillingSummaryQueryDto,
  ) {
    return this.getBranchBillingSummaryUseCase.execute(
      principal,
      organizationId,
      branchId,
      query,
    );
  }
}
