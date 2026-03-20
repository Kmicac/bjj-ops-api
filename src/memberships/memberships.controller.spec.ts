import { Test, TestingModule } from '@nestjs/testing';
import { ListMembersUseCase } from './application/use-cases/list-members.use-case';
import { UpdateMembershipRolesUseCase } from './application/use-cases/update-membership-roles.use-case';
import { UpdateMembershipScopesUseCase } from './application/use-cases/update-membership-scopes.use-case';
import { MembershipsController } from './memberships.controller';

describe('MembershipsController', () => {
  let controller: MembershipsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipsController],
      providers: [
        {
          provide: UpdateMembershipRolesUseCase,
          useValue: {},
        },
        {
          provide: UpdateMembershipScopesUseCase,
          useValue: {},
        },
        {
          provide: ListMembersUseCase,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<MembershipsController>(MembershipsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
