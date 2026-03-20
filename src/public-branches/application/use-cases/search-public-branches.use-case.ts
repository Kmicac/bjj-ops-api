import { Injectable } from '@nestjs/common';
import { buildPagination } from '../../../common/utils/pagination';
import { PublicSearchBranchesQueryDto } from '../../dto/public-search-branches.query.dto';
import { PublicBranchesRepository } from '../../infrastructure/public-branches.repository';

@Injectable()
export class SearchPublicBranchesUseCase {
  constructor(
    private readonly publicBranchesRepository: PublicBranchesRepository,
  ) {}

  async execute(query: PublicSearchBranchesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query);
    const { items, total } =
      await this.publicBranchesRepository.searchPublishedBranches({
        countryCode: query.countryCode.trim().toUpperCase(),
        city: query.city?.trim(),
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
