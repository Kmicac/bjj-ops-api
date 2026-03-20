import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { OrganizationsPolicy } from '../../domain/organizations.policy';
import { OrganizationsRepository } from '../../infrastructure/organizations.repository';

@Injectable()
export class GetOrganizationByIdUseCase {
  constructor(
    private readonly organizationsPolicy: OrganizationsPolicy,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
  ) {
    this.organizationsPolicy.ensureCanRead(principal, organizationId);
    return this.organizationsRepository.getActiveOrganizationById(organizationId);
  }
}
