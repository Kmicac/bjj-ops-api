import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsController } from './organizations.controller';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetOrganizationByIdUseCase } from './application/use-cases/get-organization-by-id.use-case';
import { ListOrganizationsUseCase } from './application/use-cases/list-organizations.use-case';
import { UpdateOrganizationStatusUseCase } from './application/use-cases/update-organization-status.use-case';
import { OrganizationsPolicy } from './domain/organizations.policy';
import { OrganizationsRepository } from './infrastructure/organizations.repository';

@Module({
  imports: [AuthModule, AuditModule],
  providers: [
    OrganizationsRepository,
    OrganizationsPolicy,
    CreateOrganizationUseCase,
    ListOrganizationsUseCase,
    GetOrganizationByIdUseCase,
    UpdateOrganizationStatusUseCase,
  ],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
