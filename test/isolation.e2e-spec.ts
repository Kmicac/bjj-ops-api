import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  BranchStatus,
  MembershipRole,
  MembershipScopeType,
  OrganizationStatus,
} from '../src/generated/prisma/enums';
import { closeE2EApp, createE2EApp } from './helpers/e2e-app';
import type { InMemoryPrismaService } from './helpers/in-memory-prisma';

describe('Tenant And Scope Isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InMemoryPrismaService;

  beforeEach(async () => {
    const setup = await createE2EApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  afterEach(async () => {
    await closeE2EApp(app);
  });

  it('enforces tenant isolation and organization-wide scope for membership management', async () => {
    const server = app.getHttpServer();
    const bootstrap = await request(server)
      .post('/api/v1/auth/bootstrap')
      .send({
        organizationName: 'Checkmat HQ',
        organizationSlug: 'checkmat-hq',
        organizationTimezone: 'America/Sao_Paulo',
        branchName: 'Checkmat Matriz',
        branchSlug: 'matriz',
        branchCountryCode: 'BR',
        branchCity: 'Sao Paulo',
        branchTimezone: 'America/Sao_Paulo',
        adminEmail: 'mestre@checkmat.test',
        adminPassword: 'SuperSecretPass123!',
        adminFirstName: 'Leo',
        adminLastName: 'Vieira',
      })
      .expect(201);

    const organizationId = bootstrap.body.principal.membership.organizationId;
    const branchAId = bootstrap.body.principal.membership.primaryBranchId;

    const branchB = await prisma.seedBranch({
      organizationId,
      name: 'Checkmat Norte',
      slug: 'norte',
      countryCode: 'BR',
      city: 'Rio de Janeiro',
      timezone: 'America/Sao_Paulo',
      status: BranchStatus.ACTIVE,
    });

    const otherOrg = await prisma.seedOrganization({
      name: 'Atos HQ',
      slug: 'atos-hq',
      status: OrganizationStatus.ACTIVE,
    });
    const otherBranch = await prisma.seedBranch({
      organizationId: otherOrg.id,
      name: 'Atos Main',
      slug: 'main',
      countryCode: 'US',
      city: 'San Diego',
      timezone: 'America/Los_Angeles',
      status: BranchStatus.ACTIVE,
    });
    const otherUser = await prisma.seedUser({
      email: 'admin@atos.test',
      password: 'AnotherSecret123!',
      firstName: 'Andre',
      lastName: 'Galvao',
    });
    await prisma.seedMembership({
      organizationId: otherOrg.id,
      userId: otherUser.id,
      roles: [MembershipRole.MESTRE],
      scopeType: MembershipScopeType.ORGANIZATION_WIDE,
      primaryBranchId: otherBranch.id,
    });

    const branchAdminUser = await prisma.seedUser({
      email: 'manager@checkmat.test',
      password: 'ScopedAdmin123!',
      firstName: 'Scoped',
      lastName: 'Manager',
    });
    const branchAdminMembership = await prisma.seedMembership({
      organizationId,
      userId: branchAdminUser.id,
      roles: [MembershipRole.ORG_ADMIN],
      scopeType: MembershipScopeType.SELECTED_BRANCHES,
      primaryBranchId: branchAId,
      branchIds: [branchAId],
    });

    const targetUser = await prisma.seedUser({
      email: 'student@checkmat.test',
      password: 'StudentSecret123!',
      firstName: 'Target',
      lastName: 'Member',
    });
    await prisma.seedMembership({
      organizationId,
      userId: targetUser.id,
      roles: [MembershipRole.STUDENT],
      scopeType: MembershipScopeType.SELECTED_BRANCHES,
      primaryBranchId: branchAId,
      branchIds: [branchAId],
    });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'manager@checkmat.test',
        password: 'ScopedAdmin123!',
        organizationSlug: 'checkmat-hq',
      })
      .expect(201);

    const token = login.body.accessToken;

    await request(server)
      .get(`/api/v1/organizations/${organizationId}/members?branchId=${branchAId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(server)
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(server)
      .put(
        `/api/v1/organizations/${organizationId}/memberships/${branchAdminMembership.id}/scopes`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send({
        scopeType: MembershipScopeType.ORGANIZATION_WIDE,
      })
      .expect(403);

    await request(server)
      .get(`/api/v1/organizations/${otherOrg.id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(server)
      .get(`/api/v1/organizations/${organizationId}/branches`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        const ids = body.items.map((item: { id: string }) => item.id);
        expect(ids).toEqual(expect.arrayContaining([branchAId, branchB.id]));
      });
  });
});
