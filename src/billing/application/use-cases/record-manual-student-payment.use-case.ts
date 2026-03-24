import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PaymentStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { RecordManualStudentPaymentDto } from '../../dto/record-manual-student-payment.dto';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';

@Injectable()
export class RecordManualStudentPaymentUseCase {
  constructor(
    private readonly billingPolicy: BillingPolicy,
    private readonly billingRepository: BillingRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    dto: RecordManualStudentPaymentDto,
  ) {
    const student = await this.billingRepository.getStudentBillingTarget(
      organizationId,
      studentId,
    );
    this.billingPolicy.ensureCanOperateStudentBilling(
      principal,
      organizationId,
      student.primaryBranch,
    );

    const policyState = await this.billingRepository.getOrCreateBillingPolicy(
      organizationId,
      student.primaryBranchId,
    );
    const grossAmount = dto.grossAmount;
    const netAmount = dto.netAmount ?? dto.grossAmount;
    const paymentStatus = dto.status ?? PaymentStatus.APPROVED;

    this.billingPolicy.ensureValidPaymentAmounts(grossAmount, netAmount);

    if (dto.billingChargeId) {
      const charge = await this.billingRepository.getBillingChargePaymentTarget(
        organizationId,
        dto.billingChargeId,
      );

      this.billingPolicy.ensureChargeBelongsToStudent(
        charge,
        studentId,
        student.primaryBranchId,
      );
      this.billingPolicy.ensureChargeCanReceivePayment(charge);
      this.billingPolicy.ensureChargeCurrencyMatchesPayment(
        charge,
        dto.currency.trim().toUpperCase(),
      );
      this.billingPolicy.ensurePartialPaymentAllowed(
        policyState,
        charge,
        paymentStatus,
        grossAmount,
      );
    }

    const payment = await this.billingRepository.recordStudentPayment({
      organizationId,
      branchId: student.primaryBranchId,
      studentId,
      billingChargeId: dto.billingChargeId,
      grossAmount: new Prisma.Decimal(grossAmount),
      netAmount: new Prisma.Decimal(netAmount),
      currency: dto.currency.trim().toUpperCase(),
      method: dto.method,
      status: paymentStatus,
      description: dto.description?.trim(),
      externalProvider: dto.externalProvider?.trim(),
      externalReference: dto.externalReference?.trim(),
      recordedByMembershipId: principal.membershipId,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      notes: dto.notes?.trim(),
    });

    await this.auditService.create({
      organizationId,
      branchId: student.primaryBranchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'payment_record.student_manual_recorded',
      entityType: 'PaymentRecord',
      entityId: payment.id,
      metadata: {
        studentId,
        billingChargeId: payment.billingChargeId,
        grossAmount: payment.grossAmount.toString(),
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
      },
    });

    return payment;
  }
}
