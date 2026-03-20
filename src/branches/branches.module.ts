import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BranchesController } from './branches.controller';
import { CreateBranchUseCase } from './application/use-cases/create-branch.use-case';
import { ListBranchesUseCase } from './application/use-cases/list-branches.use-case';
import { UpdateBranchUseCase } from './application/use-cases/update-branch.use-case';
import { BranchesPolicy } from './domain/branches.policy';
import { BranchesRepository } from './infrastructure/branches.repository';

@Module({
  imports: [AuthModule, AuditModule],
  providers: [
    BranchesRepository,
    BranchesPolicy,
    CreateBranchUseCase,
    ListBranchesUseCase,
    UpdateBranchUseCase,
  ],
  controllers: [BranchesController],
})
export class BranchesModule {}
