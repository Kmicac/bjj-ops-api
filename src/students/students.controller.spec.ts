import { Test, TestingModule } from '@nestjs/testing';
import { CreateStudentUseCase } from './application/use-cases/create-student.use-case';
import { GetStudentDetailUseCase } from './application/use-cases/get-student-detail.use-case';
import { ListStudentsByBranchUseCase } from './application/use-cases/list-students-by-branch.use-case';
import { UpdateStudentUseCase } from './application/use-cases/update-student.use-case';
import { StudentsController } from './students.controller';

describe('StudentsController', () => {
  let controller: StudentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: CreateStudentUseCase,
          useValue: {},
        },
        {
          provide: ListStudentsByBranchUseCase,
          useValue: {},
        },
        {
          provide: GetStudentDetailUseCase,
          useValue: {},
        },
        {
          provide: UpdateStudentUseCase,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<StudentsController>(StudentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
