import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { CreateOrganizationDto } from '../../dto/create-organization.dto';
import { OrganizationsPolicy } from '../../domain/organizations.policy';
import { OrganizationsRepository } from '../../infrastructure/organizations.repository';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    private readonly organizationsPolicy: OrganizationsPolicy,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    dto: CreateOrganizationDto,
  ) {
    this.organizationsPolicy.ensureCanCreate(principal);

    return this.organizationsRepository.createOrganizationWithFounderMembership({
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      name: dto.name.trim(),
      slug: dto.slug.trim().toLowerCase(),
      description: dto.description?.trim(),
      defaultTimezone: dto.defaultTimezone.trim(),
    });
  }
}
