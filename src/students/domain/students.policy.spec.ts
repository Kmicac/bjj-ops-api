import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../auth/access-control.service';
import { StudentsPolicy } from './students.policy';

describe('StudentsPolicy', () => {
  let policy: StudentsPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsPolicy,
        {
          provide: AccessControlService,
          useValue: {},
        },
      ],
    }).compile();

    policy = module.get<StudentsPolicy>(StudentsPolicy);
  });

  it('should be defined', () => {
    expect(policy).toBeDefined();
  });
});
