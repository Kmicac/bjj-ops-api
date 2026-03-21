import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassesRepository } from './classes.repository';

describe('ClassesRepository', () => {
  let repository: ClassesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesRepository,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    repository = module.get<ClassesRepository>(ClassesRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
