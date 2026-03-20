import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../auth/access-control.service';
import { OrganizationsPolicy } from './organizations.policy';

describe('OrganizationsPolicy', () => {
  let policy: OrganizationsPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsPolicy,
        {
          provide: AccessControlService,
          useValue: {},
        },
      ],
    }).compile();

    policy = module.get<OrganizationsPolicy>(OrganizationsPolicy);
  });

  it('should be defined', () => {
    expect(policy).toBeDefined();
  });
});
