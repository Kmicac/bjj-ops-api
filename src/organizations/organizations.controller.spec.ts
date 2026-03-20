import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetOrganizationByIdUseCase } from './application/use-cases/get-organization-by-id.use-case';
import { ListOrganizationsUseCase } from './application/use-cases/list-organizations.use-case';
import { UpdateOrganizationStatusUseCase } from './application/use-cases/update-organization-status.use-case';
import { OrganizationsController } from './organizations.controller';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: CreateOrganizationUseCase,
          useValue: {},
        },
        {
          provide: ListOrganizationsUseCase,
          useValue: {},
        },
        {
          provide: GetOrganizationByIdUseCase,
          useValue: {},
        },
        {
          provide: UpdateOrganizationStatusUseCase,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
