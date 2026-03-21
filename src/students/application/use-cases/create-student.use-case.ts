import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { PromotionTrack } from '../../../generated/prisma/enums';
import { CreateStudentDto } from '../../dto/create-student.dto';
import { StudentsPolicy } from '../../domain/students.policy';
import { StudentsRepository } from '../../infrastructure/students.repository';

@Injectable()
export class CreateStudentUseCase {
  constructor(
    private readonly studentsPolicy: StudentsPolicy,
    private readonly studentsRepository: StudentsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    dto: CreateStudentDto,
  ) {
    const primaryBranch = await this.studentsRepository.getBranchAccessTarget(
      organizationId,
      dto.primaryBranchId,
    );
    this.studentsPolicy.ensureCanCreate(principal, organizationId, primaryBranch);

    if (dto.userId) {
      await this.studentsRepository.assertLinkedUserBelongsToOrganization(
        organizationId,
        dto.userId,
      );
    }

    const student = await this.studentsRepository.createStudent({
      organizationId,
      primaryBranchId: dto.primaryBranchId,
      userId: dto.userId,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phone?.trim(),
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      startedBjjAt: dto.startedBjjAt ? new Date(dto.startedBjjAt) : undefined,
      joinedOrganizationAt: dto.joinedOrganizationAt
        ? new Date(dto.joinedOrganizationAt)
        : undefined,
      promotionTrack: dto.promotionTrack ?? PromotionTrack.ADULT,
      currentBelt: dto.currentBelt,
      currentStripes: dto.currentStripes ?? 0,
    });

    await this.auditService.create({
      organizationId,
      branchId: student.primaryBranchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'student.created',
      entityType: 'Student',
      entityId: student.id,
      metadata: {
        linkedUserId: student.userId,
      },
    });

    return student;
  }
}
