import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import {
  BranchStatus,
  MembershipRole,
  MembershipScopeType,
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AccessTokenClaims } from './access-token-claims.interface';
import type { AuthenticatedPrincipal } from './authenticated-principal.interface';
import { BootstrapDto } from './dto/bootstrap.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  hashPassword(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }

  signAccessToken(claims: AccessTokenClaims): Promise<string> {
    return this.jwtService.signAsync(claims);
  }

  async bootstrap(dto: BootstrapDto, request: Request) {
    const [organizationsCount, usersCount] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
    ]);

    if (organizationsCount > 0 || usersCount > 0) {
      throw new ConflictException('Bootstrap is only allowed on an empty system');
    }

    const normalizedEmail = this.normalizeEmail(dto.adminEmail);
    const passwordHash = await this.hashPassword(dto.adminPassword);
    const requestMetadata = this.getRequestMetadata(request);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName.trim(),
          slug: dto.organizationSlug.trim().toLowerCase(),
          description: dto.organizationDescription?.trim(),
          defaultTimezone: dto.organizationTimezone.trim(),
          status: OrganizationStatus.ACTIVE,
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: dto.branchName.trim(),
          slug: dto.branchSlug.trim().toLowerCase(),
          countryCode: dto.branchCountryCode.trim().toUpperCase(),
          region: dto.branchRegion?.trim(),
          city: dto.branchCity.trim(),
          addressLine1: dto.branchAddressLine1?.trim(),
          addressLine2: dto.branchAddressLine2?.trim(),
          postalCode: dto.branchPostalCode?.trim(),
          timezone: dto.branchTimezone.trim(),
          status: BranchStatus.ACTIVE,
        },
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: dto.adminFirstName.trim(),
          lastName: dto.adminLastName.trim(),
          phone: dto.adminPhone?.trim(),
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });

      const membership = await tx.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          status: MembershipStatus.ACTIVE,
          scopeType: MembershipScopeType.ORGANIZATION_WIDE,
          primaryBranchId: branch.id,
          roles: {
            create: [
              {
                role: MembershipRole.MESTRE,
              },
            ],
          },
        },
      });

      const membershipWithRelations =
        await tx.organizationMembership.findUniqueOrThrow({
          where: {
            id: membership.id,
          },
          include: {
            organization: true,
            roles: true,
            branchScopes: true,
          },
        });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          actorUserId: user.id,
          actorMembershipId: membership.id,
          requestId: requestMetadata.requestId,
          ipAddress: requestMetadata.ipAddress,
          userAgent: requestMetadata.userAgent,
          action: 'auth.bootstrap.completed',
          entityType: 'Organization',
          entityId: organization.id,
          metadata: {
            branchId: branch.id,
            bootstrapUserId: user.id,
          },
        },
      });

      return { user, membership: membershipWithRelations };
    });

    return this.buildAuthResponse(result.user, result.membership);
  }

  async login(dto: LoginDto, request: Request) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null,
      },
      include: {
        memberships: {
          where: {
            status: MembershipStatus.ACTIVE,
            organization: {
              deletedAt: null,
              status: OrganizationStatus.ACTIVE,
            },
          },
          include: {
            organization: true,
            roles: true,
            branchScopes: true,
          },
        },
      },
    });

    if (!user?.passwordHash || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.verifyPassword(user.passwordHash, dto.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = this.resolveMembership(user.memberships, dto.organizationSlug);
    const authResponse = await this.buildAuthResponse(user, membership);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    await this.auditService.create({
      organizationId: membership.organizationId,
      branchId: membership.primaryBranchId,
      actorUserId: user.id,
      actorMembershipId: membership.id,
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
      action: 'auth.login.succeeded',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        organizationSlug: membership.organization.slug,
      },
    });

    return authResponse;
  }

  async getCurrentPrincipal(principal: AuthenticatedPrincipal) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        id: principal.membershipId,
        organizationId: principal.organizationId,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        organization: true,
        user: true,
        roles: true,
        branchScopes: true,
      },
    });

    if (!membership) {
      throw new UnauthorizedException('Membership not available');
    }

    return {
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        phone: membership.user.phone,
        status: membership.user.status,
      },
      membership: {
        id: membership.id,
        organizationId: membership.organizationId,
        organizationSlug: membership.organization.slug,
        organizationName: membership.organization.name,
        assignedRoles: membership.roles.map(({ role }) => role),
        scopeType: membership.scopeType,
        branchIds: membership.branchScopes.map(({ branchId }) => branchId),
        primaryBranchId: membership.primaryBranchId,
      },
    };
  }

  private resolveMembership(
    memberships: Array<{
      id: string;
      organizationId: string;
      primaryBranchId: string | null;
      scopeType: MembershipScopeType;
      organization: { id: string; slug: string; name: string };
      roles: Array<{ role: MembershipRole }>;
      branchScopes: Array<{ branchId: string }>;
    }>,
    organizationSlug?: string,
  ) {
    if (memberships.length === 0) {
      throw new UnauthorizedException('No active organization membership found');
    }

    if (organizationSlug) {
      const membership = memberships.find(
        (candidate) => candidate.organization.slug === organizationSlug,
      );

      if (!membership) {
        throw new UnauthorizedException('Organization access denied');
      }

      return membership;
    }

    if (memberships.length > 1) {
      throw new BadRequestException(
        'organizationSlug is required when the user belongs to multiple organizations',
      );
    }

    return memberships[0];
  }

  private async buildAuthResponse(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    },
    membership: {
      id: string;
      organizationId: string;
      primaryBranchId: string | null;
      scopeType: MembershipScopeType;
      organization: { slug: string; name: string };
      roles: Array<{ role: MembershipRole }>;
      branchScopes: Array<{ branchId: string }>;
    },
  ) {
    const assignedRoles = membership.roles.map(({ role }) => role);
    const claims: AccessTokenClaims = {
      sub: user.id,
      email: user.email,
      organizationId: membership.organizationId,
      organizationSlug: membership.organization.slug,
      membershipId: membership.id,
      assignedRoles,
      scopeType: membership.scopeType,
      branchIds: membership.branchScopes.map(({ branchId }) => branchId),
      primaryBranchId: membership.primaryBranchId,
      type: 'access',
    };

    const accessToken = await this.signAccessToken(claims);

    return {
      accessToken,
      principal: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        },
        membership: {
          id: membership.id,
          organizationId: membership.organizationId,
          organizationSlug: membership.organization.slug,
          organizationName: membership.organization.name,
          assignedRoles,
          scopeType: membership.scopeType,
          branchIds: claims.branchIds,
          primaryBranchId: membership.primaryBranchId,
        },
      },
    };
  }

  private getRequestMetadata(request: Request) {
    return {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
    };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }
}
