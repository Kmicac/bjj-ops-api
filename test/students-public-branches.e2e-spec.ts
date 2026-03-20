import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  BranchStatus,
  MembershipRole,
  MembershipScopeType,
} from '../src/generated/prisma/enums';
import { closeE2EApp, createE2EApp } from './helpers/e2e-app';
import type { InMemoryPrismaService } from './helpers/in-memory-prisma';

describe('Students And Public Branches (e2e)', () => {
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

  it('enforces branch visibility for students and exposes only published public branches', async () => {
    const server = app.getHttpAdapter().getInstance();
    const bootstrap = await request(server)
      .post('/api/v1/auth/bootstrap')
      .send({
        organizationName: 'Alliance Team',
        organizationSlug: 'alliance-team',
        organizationTimezone: 'America/Sao_Paulo',
        branchName: 'Alliance Centro',
        branchSlug: 'centro',
        branchCountryCode: 'BR',
        branchCity: 'Sao Paulo',
        branchTimezone: 'America/Sao_Paulo',
        adminEmail: 'admin@alliance-team.test',
        adminPassword: 'AdminSecret123!',
        adminFirstName: 'Alliance',
        adminLastName: 'Admin',
      })
      .expect(201);

    const organizationId = bootstrap.body.principal.membership.organizationId;
    const branchAId = bootstrap.body.principal.membership.primaryBranchId;

    const branchB = await prisma.seedBranch({
      organizationId,
      name: 'Alliance Norte',
      slug: 'norte',
      countryCode: 'BR',
      city: 'Rio de Janeiro',
      timezone: 'America/Sao_Paulo',
      status: BranchStatus.ACTIVE,
      isPublicListed: true,
      publicProfile: {
        displayName: 'Alliance Norte',
        shortBio: 'Competition-focused branch in Rio.',
        publicPhone: '+55 11 99999-9999',
        website: 'https://alliance-norte.test',
        isPublished: true,
      },
    });

    const hiddenBranch = await prisma.seedBranch({
      organizationId,
      name: 'Alliance Hidden',
      slug: 'hidden',
      countryCode: 'BR',
      city: 'Curitiba',
      timezone: 'America/Sao_Paulo',
      status: BranchStatus.ACTIVE,
      isPublicListed: true,
      publicProfile: {
        displayName: 'Alliance Hidden',
        shortBio: 'Draft branch profile',
        isPublished: false,
      },
    });

    const staffUser = await prisma.seedUser({
      email: 'staff@alliance-team.test',
      password: 'StaffSecret123!',
      firstName: 'Branch',
      lastName: 'Staff',
    });
    await prisma.seedMembership({
      organizationId,
      userId: staffUser.id,
      roles: [MembershipRole.STAFF],
      scopeType: MembershipScopeType.SELECTED_BRANCHES,
      primaryBranchId: branchAId,
      branchIds: [branchAId],
    });

    const student = await prisma.seedStudent({
      organizationId,
      primaryBranchId: branchAId,
      firstName: 'Joao',
      lastName: 'Silva',
      email: 'joao@student.test',
    });

    const staffLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@alliance-team.test',
        password: 'StaffSecret123!',
        organizationSlug: 'alliance-team',
      })
      .expect(201);

    const staffToken = staffLogin.body.accessToken;

    await request(server)
      .get(`/api/v1/organizations/${organizationId}/branches/${branchAId}/students`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0].id).toBe(student.id);
      });

    await request(server)
      .get(`/api/v1/organizations/${organizationId}/branches/${branchB.id}/students`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);

    await request(server)
      .get(`/api/v1/organizations/${organizationId}/students/${student.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    const adminToken = bootstrap.body.accessToken;
    await request(server)
      .patch(`/api/v1/organizations/${organizationId}/students/${student.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        primaryBranchId: branchB.id,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.primaryBranchId).toBe(branchB.id);
      });

    await request(server)
      .get(`/api/v1/organizations/${organizationId}/students/${student.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);

    await request(server)
      .get('/api/v1/public/branches/search?countryCode=BR')
      .expect(200)
      .expect(({ body }) => {
        const branchIds = body.items.map((item: { id: string }) => item.id);
        expect(branchIds).toContain(branchB.id);
        expect(branchIds).not.toContain(hiddenBranch.id);
      });

    await request(server)
      .get(`/api/v1/public/branches/${branchB.id}`)
      .expect(200);

    await request(server)
      .get(`/api/v1/public/branches/${hiddenBranch.id}`)
      .expect(404);
  });
});
