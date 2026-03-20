import { Module } from '@nestjs/common';
import { PublicBranchesController } from './public-branches.controller';
import { GetPublicBranchDetailUseCase } from './application/use-cases/get-public-branch-detail.use-case';
import { SearchPublicBranchesUseCase } from './application/use-cases/search-public-branches.use-case';
import { PublicBranchesRepository } from './infrastructure/public-branches.repository';

@Module({
  providers: [
    PublicBranchesRepository,
    SearchPublicBranchesUseCase,
    GetPublicBranchDetailUseCase,
  ],
  controllers: [PublicBranchesController],
})
export class PublicBranchesModule {}
