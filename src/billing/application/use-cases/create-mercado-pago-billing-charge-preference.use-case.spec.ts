import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { MembershipRole, MembershipScopeType } from '../../../generated/prisma/enums';
import { CreateMercadoPagoBillingPreferenceUseCase } from '../../../integrations/application/use-cases/create-mercado-pago-billing-preference.use-case';
import { BillingPolicy } from '../../domain/billing.policy';
import { BillingRepository } from '../../infrastructure/billing.repository';
import { CreateMercadoPagoBillingChargePreferenceUseCase } from './create-mercado-pago-billing-charge-preference.use-case';

describe('CreateMercadoPagoBillingChargePreferenceUseCase', () => {
  let useCase: CreateMercadoPagoBillingChargePreferenceUseCase;
  let billingPolicy: {
    ensureCanOperateStudentBilling: jest.Mock;
    ensureChargeBelongsToStudent: jest.Mock;
    ensureChargeEligibleForMercadoPagoPreference: jest.Mock;
  };
  let billingRepository: {
    getStudentBillingTarget: jest.Mock;
    getBillingChargeMercadoPagoPreferenceTarget: jest.Mock;
    attachMercadoPagoPreferenceToBillingCharge: jest.Mock;
  };
  let createMercadoPagoBillingPreferenceUseCase: {
    execute: jest.Mock;
  };
  let auditService: {
    create: jest.Mock;
  };

  const principal: AuthenticatedPrincipal = {
    sub: 'user_1',
    email: 'manager@snp.local',
    type: 'access',
    organizationSlug: 'org-snp',
    organizationId: 'org_1',
    membershipId: 'membership_1',
    assignedRoles: [MembershipRole.ACADEMY_MANAGER],
    scopeType: MembershipScopeType.SELECTED_BRANCHES,
    branchIds: ['branch_1'],
    primaryBranchId: 'branch_1',
  };

  beforeEach(async () => {
    billingPolicy = {
      ensureCanOperateStudentBilling: jest.fn(),
      ensureChargeBelongsToStudent: jest.fn(),
      ensureChargeEligibleForMercadoPagoPreference: jest.fn(),
    };

    billingRepository = {
      getStudentBillingTarget: jest.fn().mockResolvedValue({
        id: 'student_1',
        email: 'student_1@example.com',
        firstName: 'Helio',
        lastName: 'Gracie',
        primaryBranchId: 'branch_1',
        primaryBranch: {
          id: 'branch_1',
          organizationId: 'org_1',
          headCoachMembershipId: null,
        },
      }),
      getBillingChargeMercadoPagoPreferenceTarget: jest.fn().mockResolvedValue({
        id: 'charge_1',
        organizationId: 'org_1',
        branchId: 'branch_1',
        studentId: 'student_1',
        amount: { minus: jest.fn().mockReturnValue({ toNumber: () => 100 }) },
        amountPaid: { toNumber: () => 0 },
        currency: 'ARS',
        status: 'PENDING',
        chargeType: 'MEMBERSHIP_FEE',
        description: 'March membership',
        externalProvider: null,
        externalReference: null,
      }),
      attachMercadoPagoPreferenceToBillingCharge: jest.fn().mockResolvedValue({
        id: 'charge_1',
      }),
    };

    createMercadoPagoBillingPreferenceUseCase = {
      execute: jest.fn().mockResolvedValue({
        connectionId: 'integration_1',
        environment: 'test',
        publicKey: 'APP_USR-123456-public',
        preferenceId: 'pref_123',
        externalReference: 'billing_charge:charge_1',
        initPoint: 'https://www.mercadopago.com/init/pref_123',
        sandboxInitPoint: 'https://sandbox.mercadopago.com/init/pref_123',
        reused: false,
      }),
    };

    auditService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateMercadoPagoBillingChargePreferenceUseCase,
        {
          provide: BillingPolicy,
          useValue: billingPolicy,
        },
        {
          provide: BillingRepository,
          useValue: billingRepository,
        },
        {
          provide: CreateMercadoPagoBillingPreferenceUseCase,
          useValue: createMercadoPagoBillingPreferenceUseCase,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    useCase = module.get<CreateMercadoPagoBillingChargePreferenceUseCase>(
      CreateMercadoPagoBillingChargePreferenceUseCase,
    );
  });

  it('creates a Mercado Pago preference for an eligible billing charge and returns a safe response', async () => {
    const result = await useCase.execute(
      principal,
      'org_1',
      'student_1',
      'charge_1',
    );

    expect(
      billingPolicy.ensureCanOperateStudentBilling,
    ).toHaveBeenCalledWith(
      principal,
      'org_1',
      expect.objectContaining({
        id: 'branch_1',
      }),
    );
    expect(
      billingPolicy.ensureChargeEligibleForMercadoPagoPreference,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'charge_1',
        branchId: 'branch_1',
        studentId: 'student_1',
      }),
    );
    expect(createMercadoPagoBillingPreferenceUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        branchId: 'branch_1',
        billingChargeId: 'charge_1',
        externalReference: 'billing_charge:charge_1',
        currency: 'ARS',
        payer: {
          email: 'student_1@example.com',
          firstName: 'Helio',
          lastName: 'Gracie',
        },
      }),
    );
    expect(
      billingRepository.attachMercadoPagoPreferenceToBillingCharge,
    ).toHaveBeenCalledWith({
      organizationId: 'org_1',
      chargeId: 'charge_1',
      externalProvider: 'MERCADO_PAGO',
      externalReference: 'pref_123',
    });
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing_charge.mercado_pago_preference_created',
        entityId: 'charge_1',
      }),
    );
    expect(result).toEqual({
      chargeId: 'charge_1',
      provider: 'MERCADO_PAGO',
      publicKey: 'APP_USR-123456-public',
      preferenceId: 'pref_123',
      externalReference: 'billing_charge:charge_1',
      initPoint: 'https://www.mercadopago.com/init/pref_123',
      sandboxInitPoint: 'https://sandbox.mercadopago.com/init/pref_123',
      environment: 'test',
      reused: false,
    });
    expect(JSON.stringify(result)).not.toContain('accessToken');
    expect(JSON.stringify(result)).not.toContain('configJson');
  });

  it('reuses an existing Mercado Pago preference without rewriting the charge reference', async () => {
    billingRepository.getBillingChargeMercadoPagoPreferenceTarget.mockResolvedValue({
      id: 'charge_1',
      organizationId: 'org_1',
      branchId: 'branch_1',
      studentId: 'student_1',
      amount: { minus: jest.fn().mockReturnValue({ toNumber: () => 100 }) },
      amountPaid: { toNumber: () => 0 },
      currency: 'ARS',
      status: 'PENDING',
      chargeType: 'MEMBERSHIP_FEE',
      description: 'March membership',
      externalProvider: 'MERCADO_PAGO',
      externalReference: 'pref_123',
    });
    createMercadoPagoBillingPreferenceUseCase.execute.mockResolvedValue({
      connectionId: 'integration_1',
      environment: 'test',
      publicKey: 'APP_USR-123456-public',
      preferenceId: 'pref_123',
      externalReference: 'billing_charge:charge_1',
      initPoint: 'https://www.mercadopago.com/init/pref_123',
      sandboxInitPoint: 'https://sandbox.mercadopago.com/init/pref_123',
      reused: true,
    });

    const result = await useCase.execute(
      principal,
      'org_1',
      'student_1',
      'charge_1',
    );

    expect(
      billingRepository.attachMercadoPagoPreferenceToBillingCharge,
    ).not.toHaveBeenCalled();
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'billing_charge.mercado_pago_preference_reused',
      }),
    );
    expect(result.reused).toBe(true);
  });

  it('stops when the charge is not eligible for an external preference', async () => {
    billingPolicy.ensureChargeEligibleForMercadoPagoPreference.mockImplementation(() => {
      throw new ConflictException('Billing charge is already fully paid');
    });

    await expect(
      useCase.execute(principal, 'org_1', 'student_1', 'charge_1'),
    ).rejects.toThrow('Billing charge is already fully paid');

    expect(createMercadoPagoBillingPreferenceUseCase.execute).not.toHaveBeenCalled();
  });

  it('stops when the charge does not belong to the student branch scope', async () => {
    billingPolicy.ensureChargeBelongsToStudent.mockImplementation(() => {
      throw new ConflictException(
        'Billing charge does not belong to the same student billing context',
      );
    });

    await expect(
      useCase.execute(principal, 'org_1', 'student_1', 'charge_1'),
    ).rejects.toThrow(
      'Billing charge does not belong to the same student billing context',
    );

    expect(createMercadoPagoBillingPreferenceUseCase.execute).not.toHaveBeenCalled();
  });

  it('fails when no branch Mercado Pago integration is configured', async () => {
    createMercadoPagoBillingPreferenceUseCase.execute.mockRejectedValue(
      new NotFoundException('Active branch integration connection not found'),
    );

    await expect(
      useCase.execute(principal, 'org_1', 'student_1', 'charge_1'),
    ).rejects.toThrow('Active branch integration connection not found');
  });
});
