import { Test, TestingModule } from '@nestjs/testing';
import { MembershipsPolicy } from '../../domain/memberships.policy';
import { MembershipsRepository } from '../../infrastructure/memberships.repository';
import { ListMembersUseCase } from './list-members.use-case';

describe('ListMembersUseCase', () => {
  let useCase: ListMembersUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListMembersUseCase,
        {
          provide: MembershipsPolicy,
          useValue: {},
        },
        {
          provide: MembershipsRepository,
          useValue: {},
        },
      ],
    }).compile();

    useCase = module.get<ListMembersUseCase>(ListMembersUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });
});
