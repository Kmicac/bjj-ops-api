import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../auth/access-control.service';
import { AttendancePolicy } from './attendance.policy';

describe('AttendancePolicy', () => {
  let policy: AttendancePolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendancePolicy,
        {
          provide: AccessControlService,
          useValue: {},
        },
      ],
    }).compile();

    policy = module.get<AttendancePolicy>(AttendancePolicy);
  });

  it('should be defined', () => {
    expect(policy).toBeDefined();
  });
});
