import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreateBranchDto } from '../../dto/create-branch.dto';
import { BranchesPolicy } from '../../domain/branches.policy';
import { BranchesRepository } from '../../infrastructure/branches.repository';

@Injectable()
export class CreateBranchUseCase {
  constructor(
    private readonly branchesPolicy: BranchesPolicy,
    private readonly branchesRepository: BranchesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    dto: CreateBranchDto,
  ) {
    this.branchesPolicy.ensureCanCreate(principal, organizationId);

    const branch = await this.branchesRepository.createBranch({
      organizationId,
      name: dto.name.trim(),
      slug: dto.slug.trim().toLowerCase(),
      countryCode: dto.countryCode.trim().toUpperCase(),
      region: dto.region?.trim(),
      city: dto.city.trim(),
      addressLine1: dto.addressLine1?.trim(),
      addressLine2: dto.addressLine2?.trim(),
      postalCode: dto.postalCode?.trim(),
      timezone: dto.timezone.trim(),
      isPublicListed: dto.isPublicListed ?? false,
      publicProfile: dto.publicProfile
        ? {
            displayName: dto.publicProfile.displayName?.trim(),
            shortBio: dto.publicProfile.shortBio?.trim(),
            publicEmail: dto.publicProfile.publicEmail?.trim(),
            publicPhone: dto.publicProfile.publicPhone?.trim(),
            whatsapp: dto.publicProfile.whatsapp?.trim(),
            instagram: dto.publicProfile.instagram?.trim(),
            facebook: dto.publicProfile.facebook?.trim(),
            youtube: dto.publicProfile.youtube?.trim(),
            tiktok: dto.publicProfile.tiktok?.trim(),
            website: dto.publicProfile.website?.trim(),
            isPublished: dto.publicProfile.isPublished ?? false,
          }
        : undefined,
    });

    await this.auditService.create({
      organizationId,
      branchId: branch.id,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'branch.created',
      entityType: 'Branch',
      entityId: branch.id,
      metadata: {
        slug: branch.slug,
      },
    });

    return branch;
  }
}
