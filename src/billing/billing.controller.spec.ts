import { Test, TestingModule } from '@nestjs/testing';
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
import { RecordGeneralIncomeUseCase } from './application/use-cases/record-general-income.use-case';
import { RecordManualStudentPaymentUseCase } from './application/use-cases/record-manual-student-payment.use-case';
import { ReviewPossibleDuplicatePaymentsUseCase } from './application/use-cases/review-possible-duplicate-payments.use-case';
import { UpdateBillingPlanUseCase } from './application/use-cases/update-billing-plan.use-case';
import { UpdateBranchBillingPolicyUseCase } from './application/use-cases/update-branch-billing-policy.use-case';
import { UpdateStudentMembershipUseCase } from './application/use-cases/update-student-membership.use-case';

describe('BillingController', () => {
  let controller: BillingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        { provide: CreateBillingPlanUseCase, useValue: {} },
        { provide: ListBillingPlansUseCase, useValue: {} },
        { provide: UpdateBillingPlanUseCase, useValue: {} },
        { provide: CreateMercadoPagoBillingChargePreferenceUseCase, useValue: {} },
        { provide: CreateStudentMembershipUseCase, useValue: {} },
        { provide: GetStudentMembershipUseCase, useValue: {} },
        { provide: UpdateStudentMembershipUseCase, useValue: {} },
        { provide: CreateBillingChargeUseCase, useValue: {} },
        { provide: ListStudentBillingChargesUseCase, useValue: {} },
        { provide: ListBranchBillingChargesUseCase, useValue: {} },
        { provide: ListBranchStudentFinancialStatusesUseCase, useValue: {} },
        { provide: RecordManualStudentPaymentUseCase, useValue: {} },
        { provide: RecordGeneralIncomeUseCase, useValue: {} },
        { provide: ListStudentPaymentsUseCase, useValue: {} },
        { provide: ListBranchPaymentsUseCase, useValue: {} },
        { provide: GetStudentBillingContextUseCase, useValue: {} },
        { provide: GetBranchBillingPolicyUseCase, useValue: {} },
        { provide: UpdateBranchBillingPolicyUseCase, useValue: {} },
        { provide: ReviewPossibleDuplicatePaymentsUseCase, useValue: {} },
        { provide: GetBranchBillingSummaryUseCase, useValue: {} },
      ],
    }).compile();

    controller = module.get<BillingController>(BillingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
