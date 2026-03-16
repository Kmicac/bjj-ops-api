import { Module } from '@nestjs/common';
import { PublicBranchesService } from './public-branches.service';
import { PublicBranchesController } from './public-branches.controller';

@Module({
  providers: [PublicBranchesService],
  controllers: [PublicBranchesController]
})
export class PublicBranchesModule {}
