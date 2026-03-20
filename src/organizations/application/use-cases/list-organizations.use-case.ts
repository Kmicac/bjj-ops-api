import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildPagination } from '../../../common/utils/pagination';
import { OrganizationsPolicy } from '../../domain/organizations.policy';
import { OrganizationsRepository } from '../../infrastructure/organizations.repository';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    private readonly organizationsPolicy: OrganizationsPolicy,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    pagination: PaginationQueryDto,
  ) {
    this.organizationsPolicy.ensureCanList(principal);

    const { page, limit, skip, take } = buildPagination(pagination);
    const { items, total } =
      await this.organizationsRepository.listAccessibleOrganizations({
        userId: principal.sub,
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
