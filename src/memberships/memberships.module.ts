import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ListMembersUseCase } from './application/use-cases/list-members.use-case';
import { UpdateMembershipRolesUseCase } from './application/use-cases/update-membership-roles.use-case';
import { UpdateMembershipScopesUseCase } from './application/use-cases/update-membership-scopes.use-case';
import { MembershipsController } from './memberships.controller';
import { MembershipsPolicy } from './domain/memberships.policy';
import { MembershipsRepository } from './infrastructure/memberships.repository';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [MembershipsController],
  providers: [
    MembershipsRepository,
    MembershipsPolicy,
    UpdateMembershipRolesUseCase,
    UpdateMembershipScopesUseCase,
    ListMembersUseCase,
  ],
})
export class MembershipsModule {}
