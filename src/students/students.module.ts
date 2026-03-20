import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CreateStudentUseCase } from './application/use-cases/create-student.use-case';
import { GetStudentDetailUseCase } from './application/use-cases/get-student-detail.use-case';
import { ListStudentsByBranchUseCase } from './application/use-cases/list-students-by-branch.use-case';
import { UpdateStudentUseCase } from './application/use-cases/update-student.use-case';
import { StudentsPolicy } from './domain/students.policy';
import { StudentsRepository } from './infrastructure/students.repository';
import { StudentsController } from './students.controller';

@Module({
  imports: [AuthModule, AuditModule],
  providers: [
    StudentsRepository,
    StudentsPolicy,
    CreateStudentUseCase,
    ListStudentsByBranchUseCase,
    GetStudentDetailUseCase,
    UpdateStudentUseCase,
  ],
  controllers: [StudentsController],
})
export class StudentsModule {}
