import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreateClassScheduleDto } from '../../dto/create-class-schedule.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class CreateClassScheduleUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    dto: CreateClassScheduleDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanCreateSchedule(principal, organizationId, branch);
    this.classesPolicy.ensureValidScheduleTimeWindow(dto.startTime, dto.endTime);

    const instructor = await this.classesRepository.findInstructorCandidate({
      organizationId,
      branchId,
      membershipId: dto.instructorMembershipId,
    });
    this.classesPolicy.ensureValidInstructorCandidate(instructor);

    const schedule = await this.classesRepository.createClassSchedule({
      organizationId,
      branchId,
      instructorMembershipId: dto.instructorMembershipId,
      title: dto.title.trim(),
      classType: dto.classType,
      description: dto.description?.trim(),
      weekday: dto.weekday,
      startTime: dto.startTime,
      endTime: dto.endTime,
      timezone: dto.timezone?.trim() ?? branch.timezone,
      capacity: dto.capacity,
      isActive: dto.isActive ?? true,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'class_schedule.created',
      entityType: 'ClassSchedule',
      entityId: schedule.id,
      metadata: {
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      },
    });

    return schedule;
  }
}
