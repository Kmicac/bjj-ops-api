import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { buildPagination } from '../../../common/utils/pagination';
import { ListClassSessionsQueryDto } from '../../dto/list-class-sessions.query.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class ListBranchClassSessionsUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    query: ListClassSessionsQueryDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanListSessions(principal, organizationId, branch);
    this.classesPolicy.ensureValidSessionDateRange(query.fromDate, query.toDate);

    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } = await this.classesRepository.listBranchClassSessions({
      organizationId,
      branchId,
      fromDate: query.fromDate,
      toDate: query.toDate,
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
