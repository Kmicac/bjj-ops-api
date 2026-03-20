import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildPagination } from '../../../common/utils/pagination';
import { BranchesPolicy } from '../../domain/branches.policy';
import { BranchesRepository } from '../../infrastructure/branches.repository';

@Injectable()
export class ListBranchesUseCase {
  constructor(
    private readonly branchesPolicy: BranchesPolicy,
    private readonly branchesRepository: BranchesRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    pagination: PaginationQueryDto,
  ) {
    this.branchesPolicy.ensureCanList(principal, organizationId);

    const { page, limit, skip, take } = buildPagination(pagination);
    const { items, total } =
      await this.branchesRepository.listOrganizationBranches({
        organizationId,
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
