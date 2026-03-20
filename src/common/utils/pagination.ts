import type { PaginationQueryDto } from '../dto/pagination-query.dto';

export function buildPagination(pagination: PaginationQueryDto) {
  const page = pagination.page;
  const limit = pagination.limit;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}
