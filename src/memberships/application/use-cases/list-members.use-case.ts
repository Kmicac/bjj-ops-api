import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListMembersQueryDto } from '../../dto/list-members.query.dto';
import { MembershipsPolicy } from '../../domain/memberships.policy';
import { MembershipsRepository } from '../../infrastructure/memberships.repository';

@Injectable()
export class ListMembersUseCase {
  constructor(
    private readonly membershipsPolicy: MembershipsPolicy,
    private readonly membershipsRepository: MembershipsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    query: ListMembersQueryDto,
  ) {
    const branch = query.branchId
      ? await this.membershipsRepository.getBranchAccessTarget(
          organizationId,
          query.branchId,
        )
      : null;

    this.membershipsPolicy.ensureCanListMembers(
      principal,
      organizationId,
      branch,
    );

    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } = await this.membershipsRepository.listMembers({
      organizationId,
      branchId: query.branchId,
      status: query.status,
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
