import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateBranchDto } from '../../dto/update-branch.dto';
import { BranchesPolicy } from '../../domain/branches.policy';
import { BranchesRepository } from '../../infrastructure/branches.repository';

@Injectable()
export class UpdateBranchUseCase {
  constructor(
    private readonly branchesPolicy: BranchesPolicy,
    private readonly branchesRepository: BranchesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    dto: UpdateBranchDto,
  ) {
    this.branchesPolicy.ensureCanUpdate(principal, organizationId);
    await this.branchesRepository.ensureBranchExists(organizationId, branchId);

    if (dto.headCoachMembershipId) {
      const candidate = await this.branchesRepository.findHeadCoachCandidate({
        organizationId,
        membershipId: dto.headCoachMembershipId,
        branchId,
      });
      this.branchesPolicy.ensureValidHeadCoachCandidate(candidate);
    }

    const updatedBranch = await this.branchesRepository.updateBranch({
      organizationId,
      branchId,
      name: dto.name?.trim(),
      slug: dto.slug?.trim().toLowerCase(),
      countryCode: dto.countryCode?.trim().toUpperCase(),
      region: dto.region?.trim(),
      city: dto.city?.trim(),
      addressLine1: dto.addressLine1?.trim(),
      addressLine2: dto.addressLine2?.trim(),
      postalCode: dto.postalCode?.trim(),
      timezone: dto.timezone?.trim(),
      isPublicListed: dto.isPublicListed,
      headCoachMembershipId:
        dto.headCoachMembershipId !== undefined ? dto.headCoachMembershipId : undefined,
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
            isPublished: dto.publicProfile.isPublished,
          }
        : undefined,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'branch.updated',
      entityType: 'Branch',
      entityId: branchId,
      metadata: {
        headCoachMembershipId: dto.headCoachMembershipId,
      },
    });

    return updatedBranch;
  }
}
