import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../auth/access-control.service';
import { ClassesPolicy } from './classes.policy';

describe('ClassesPolicy', () => {
  let policy: ClassesPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesPolicy,
        {
          provide: AccessControlService,
          useValue: {},
        },
      ],
    }).compile();

    policy = module.get<ClassesPolicy>(ClassesPolicy);
  });

  it('should be defined', () => {
    expect(policy).toBeDefined();
  });
});
