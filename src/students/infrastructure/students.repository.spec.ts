import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsRepository } from './students.repository';

describe('StudentsRepository', () => {
  let repository: StudentsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsRepository,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    repository = module.get<StudentsRepository>(StudentsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
