import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetPublicBranchDetailUseCase } from './application/use-cases/get-public-branch-detail.use-case';
import { SearchPublicBranchesUseCase } from './application/use-cases/search-public-branches.use-case';
import { PublicSearchBranchesQueryDto } from './dto/public-search-branches.query.dto';

@Controller('public/branches')
export class PublicBranchesController {
  constructor(
    private readonly searchPublicBranchesUseCase: SearchPublicBranchesUseCase,
    private readonly getPublicBranchDetailUseCase: GetPublicBranchDetailUseCase,
  ) {}

  @Get('search')
  search(@Query() query: PublicSearchBranchesQueryDto) {
    return this.searchPublicBranchesUseCase.execute(query);
  }

  @Get(':branchId')
  getDetail(@Param('branchId') branchId: string) {
    return this.getPublicBranchDetailUseCase.execute(branchId);
  }
}
