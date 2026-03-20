import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { StudentsPolicy } from '../../domain/students.policy';
import { StudentsRepository } from '../../infrastructure/students.repository';

@Injectable()
export class GetStudentDetailUseCase {
  constructor(
    private readonly studentsPolicy: StudentsPolicy,
    private readonly studentsRepository: StudentsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    studentId: string,
  ) {
    const student = await this.studentsRepository.getStudentDetailForVisibility(
      organizationId,
      studentId,
    );

    this.studentsPolicy.ensureCanRead(principal, organizationId, student);

    const { primaryBranch, ...detail } = student;
    return detail;
  }
}
