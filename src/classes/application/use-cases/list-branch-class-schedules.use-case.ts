import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildPagination } from '../../../common/utils/pagination';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class ListBranchClassSchedulesUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    pagination: PaginationQueryDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanListSchedules(principal, organizationId, branch);

    const { page, limit, skip, take } = buildPagination(pagination);
    const { items, total } = await this.classesRepository.listBranchClassSchedules({
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
