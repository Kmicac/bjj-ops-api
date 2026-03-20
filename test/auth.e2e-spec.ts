import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { closeE2EApp, createE2EApp } from './helpers/e2e-app';

describe('Auth Flows (e2e)', () => {
  let app: INestApplication<App>;

  const bootstrapPayload = {
    organizationName: 'Alliance HQ',
    organizationSlug: 'alliance-hq',
    organizationDescription: 'Main organization',
    organizationTimezone: 'America/Sao_Paulo',
    branchName: 'Alliance Matrix',
    branchSlug: 'matrix',
    branchCountryCode: 'BR',
    branchCity: 'Sao Paulo',
    branchTimezone: 'America/Sao_Paulo',
    adminEmail: 'admin@alliance.test',
    adminPassword: 'SuperSecretPass123!',
    adminFirstName: 'Carlos',
    adminLastName: 'Silva',
  };

  beforeEach(async () => {
    const setup = await createE2EApp();
    app = setup.app;
  });

  afterEach(async () => {
    await closeE2EApp(app);
  });

  it('bootstraps the system once, logs in, and returns the current principal', async () => {
    const server = app.getHttpAdapter().getInstance();
    const bootstrap = await request(server)
      .post('/api/v1/auth/bootstrap')
      .send(bootstrapPayload)
      .expect(201);

    expect(bootstrap.body.accessToken).toEqual(expect.any(String));
    expect(bootstrap.body.principal.user.email).toBe('admin@alliance.test');
    expect(bootstrap.body.principal.membership.organizationSlug).toBe('alliance-hq');
    expect(bootstrap.body.principal.membership.assignedRoles).toEqual(['MESTRE']);

    await request(server)
      .post('/api/v1/auth/bootstrap')
      .send(bootstrapPayload)
      .expect(409);

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@alliance.test',
        password: 'SuperSecretPass123!',
      })
      .expect(201);

    const me = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body.user.email).toBe('admin@alliance.test');
    expect(me.body.membership.organizationSlug).toBe('alliance-hq');
    expect(me.body.membership.primaryBranchId).toEqual(expect.any(String));
  });
});
