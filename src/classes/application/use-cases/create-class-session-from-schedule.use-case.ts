import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreateClassSessionFromScheduleDto } from '../../dto/create-class-session-from-schedule.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class CreateClassSessionFromScheduleUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    scheduleId: string,
    dto: CreateClassSessionFromScheduleDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanCreateSession(principal, organizationId, branch);

    const schedule = await this.classesRepository.getClassScheduleSnapshot(
      organizationId,
      branchId,
      scheduleId,
    );

    this.classesPolicy.ensureScheduleCanSpawnSession(schedule);
    this.classesPolicy.ensureScheduledDateMatchesWeekday(
      dto.scheduledDate,
      schedule.weekday,
    );

    const startAt = this.classesPolicy.buildSessionTimestampFromSchedule({
      scheduledDate: dto.scheduledDate,
      localTime: schedule.startTime,
      timeZone: schedule.timezone,
    });
    const endAt = this.classesPolicy.buildSessionTimestampFromSchedule({
      scheduledDate: dto.scheduledDate,
      localTime: schedule.endTime,
      timeZone: schedule.timezone,
    });

    this.classesPolicy.ensureValidSessionTimeWindow({
      branchTimezone: schedule.timezone,
      scheduledDate: dto.scheduledDate,
      startAt,
      endAt,
    });

    const session =
      await this.classesRepository.createClassSessionWithConsistencyChecks({
      organizationId,
      branchId,
      classScheduleId: schedule.id,
      instructorMembershipId: schedule.instructorMembershipId,
      title: schedule.title,
      classType: schedule.classType,
      scheduledDateIso: dto.scheduledDate,
      scheduledDate: this.classesPolicy.parseIsoDate(dto.scheduledDate),
      startAt,
      endAt,
      capacity: schedule.capacity ?? undefined,
      notes: dto.notes?.trim(),
      enforceScheduleDateUniqueness: true,
      enforceOverlapValidation: true,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'class_session.created_from_schedule',
      entityType: 'ClassSession',
      entityId: session.id,
      metadata: {
        classScheduleId: schedule.id,
        scheduledDate: dto.scheduledDate,
        instructorMembershipId: schedule.instructorMembershipId,
        overlapChecks: {
          branch: true,
          instructor: true,
        },
      },
    });

    return session;
  }
}
