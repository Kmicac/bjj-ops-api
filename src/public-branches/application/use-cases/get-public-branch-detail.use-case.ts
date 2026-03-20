import { Injectable } from '@nestjs/common';
import { PublicBranchesRepository } from '../../infrastructure/public-branches.repository';

@Injectable()
export class GetPublicBranchDetailUseCase {
  constructor(
    private readonly publicBranchesRepository: PublicBranchesRepository,
  ) {}

  async execute(branchId: string) {
    return this.publicBranchesRepository.getPublishedBranchDetail(branchId);
  }
}
