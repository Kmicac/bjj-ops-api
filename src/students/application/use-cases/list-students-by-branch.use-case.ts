import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildPagination } from '../../../common/utils/pagination';
import { StudentsPolicy } from '../../domain/students.policy';
import { StudentsRepository } from '../../infrastructure/students.repository';

@Injectable()
export class ListStudentsByBranchUseCase {
  constructor(
    private readonly studentsPolicy: StudentsPolicy,
    private readonly studentsRepository: StudentsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    pagination: PaginationQueryDto,
  ) {
    const branch = await this.studentsRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.studentsPolicy.ensureCanListByBranch(principal, organizationId, branch);

    const { page, limit, skip, take } = buildPagination(pagination);
    const { items, total } = await this.studentsRepository.listStudentsByPrimaryBranch({
      organizationId,
      branchId,
      skip,
      take,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
      },
    };
  }
}
