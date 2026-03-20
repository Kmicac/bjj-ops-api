import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateStudentDto } from '../../dto/update-student.dto';
import { StudentsPolicy } from '../../domain/students.policy';
import { StudentsRepository } from '../../infrastructure/students.repository';

@Injectable()
export class UpdateStudentUseCase {
  constructor(
    private readonly studentsPolicy: StudentsPolicy,
    private readonly studentsRepository: StudentsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
    dto: UpdateStudentDto,
  ) {
    const existingStudent = await this.studentsRepository.getStudentDetailForVisibility(
      organizationId,
      studentId,
    );

    const nextPrimaryBranch =
      dto.primaryBranchId && dto.primaryBranchId !== existingStudent.primaryBranchId
        ? await this.studentsRepository.getBranchAccessTarget(
            organizationId,
            dto.primaryBranchId,
          )
        : null;

    this.studentsPolicy.ensureCanUpdate(
      principal,
      organizationId,
      existingStudent,
      nextPrimaryBranch,
    );

    if (dto.userId) {
      await this.studentsRepository.assertLinkedUserBelongsToOrganization(
        organizationId,
        dto.userId,
      );
    }

    const updatedStudent = await this.studentsRepository.updateStudent({
      studentId,
      primaryBranchId: dto.primaryBranchId,
      userId: dto.userId !== undefined ? dto.userId : undefined,
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phone?.trim(),
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      startedBjjAt: dto.startedBjjAt ? new Date(dto.startedBjjAt) : undefined,
      joinedOrganizationAt: dto.joinedOrganizationAt
        ? new Date(dto.joinedOrganizationAt)
        : undefined,
      currentBelt: dto.currentBelt?.trim(),
      currentStripes: dto.currentStripes,
    });

    await this.auditService.create({
      organizationId,
      branchId: updatedStudent.primaryBranchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'student.updated',
      entityType: 'Student',
      entityId: studentId,
      metadata: {
        linkedUserId: updatedStudent.userId,
        previousPrimaryBranchId: existingStudent.primaryBranchId,
        newPrimaryBranchId: updatedStudent.primaryBranchId,
      },
    });

    return updatedStudent;
  }
}
