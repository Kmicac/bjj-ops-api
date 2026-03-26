import { forwardRef, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { BillingAttendanceEnforcementService } from './application/billing-attendance-enforcement.service';
import { BillingController } from './billing.controller';
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
import { ObserveMercadoPagoPaymentWebhookUseCase } from './application/use-cases/observe-mercado-pago-payment-webhook.use-case';
import { RecordGeneralIncomeUseCase } from './application/use-cases/record-general-income.use-case';
import { RecordManualStudentPaymentUseCase } from './application/use-cases/record-manual-student-payment.use-case';
import { ReviewPossibleDuplicatePaymentsUseCase } from './application/use-cases/review-possible-duplicate-payments.use-case';
import { UpdateBillingPlanUseCase } from './application/use-cases/update-billing-plan.use-case';
import { UpdateBranchBillingPolicyUseCase } from './application/use-cases/update-branch-billing-policy.use-case';
import { UpdateStudentMembershipUseCase } from './application/use-cases/update-student-membership.use-case';
import { BillingPolicy } from './domain/billing.policy';
import { MercadoPagoPaymentPolicy } from './domain/mercado-pago-payment.policy';
import { BillingRepository } from './infrastructure/billing.repository';

@Module({
  imports: [AuthModule, AuditModule, forwardRef(() => IntegrationsModule)],
  providers: [
    BillingRepository,
    BillingPolicy,
    MercadoPagoPaymentPolicy,
    BillingAttendanceEnforcementService,
    CreateBillingPlanUseCase,
    ListBillingPlansUseCase,
    UpdateBillingPlanUseCase,
    CreateMercadoPagoBillingChargePreferenceUseCase,
    CreateStudentMembershipUseCase,
    GetStudentMembershipUseCase,
    UpdateStudentMembershipUseCase,
    CreateBillingChargeUseCase,
    ListStudentBillingChargesUseCase,
    ListBranchBillingChargesUseCase,
    ListBranchStudentFinancialStatusesUseCase,
    RecordManualStudentPaymentUseCase,
    RecordGeneralIncomeUseCase,
    ListStudentPaymentsUseCase,
    ObserveMercadoPagoPaymentWebhookUseCase,
    ListBranchPaymentsUseCase,
    GetStudentBillingContextUseCase,
    GetBranchBillingPolicyUseCase,
    UpdateBranchBillingPolicyUseCase,
    ReviewPossibleDuplicatePaymentsUseCase,
    GetBranchBillingSummaryUseCase,
  ],
  controllers: [BillingController],
  exports: [
    BillingAttendanceEnforcementService,
    ObserveMercadoPagoPaymentWebhookUseCase,
  ],
})
export class BillingModule {}
