import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { GenerateClassSessionsDto } from '../../dto/generate-class-sessions.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class GenerateMissingClassSessionsFromSchedulesUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    dto: GenerateClassSessionsDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanGenerateSessions(
      principal,
      organizationId,
      branch,
    );
    this.classesPolicy.ensureValidGenerationDateRange(dto.fromDate, dto.toDate);

    const [schedules, sessions] = await Promise.all([
      this.classesRepository.listActiveClassScheduleSnapshots(
        organizationId,
        branchId,
      ),
      this.classesRepository.listBranchClassSessionsInRange({
        organizationId,
        branchId,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
      }),
    ]);

    const materializedSessionKeys = new Set(
      sessions
        .filter((session) => session.classScheduleId)
        .map(
          (session) =>
            `${session.classScheduleId}:${session.scheduledDate.toISOString().slice(0, 10)}`,
        ),
    );

    const candidates = schedules.flatMap((schedule) =>
      this.classesPolicy
        .listScheduledDatesForWeekdayInRange({
          fromDate: dto.fromDate,
          toDate: dto.toDate,
          weekday: schedule.weekday,
        })
        .filter(
          (scheduledDate) =>
            !materializedSessionKeys.has(`${schedule.id}:${scheduledDate}`),
        )
        .map((scheduledDate) => {
          const startAt = this.classesPolicy.buildSessionTimestampFromSchedule({
            scheduledDate,
            localTime: schedule.startTime,
            timeZone: schedule.timezone,
          });
          const endAt = this.classesPolicy.buildSessionTimestampFromSchedule({
            scheduledDate,
            localTime: schedule.endTime,
            timeZone: schedule.timezone,
          });

          this.classesPolicy.ensureValidSessionTimeWindow({
            branchTimezone: schedule.timezone,
            scheduledDate,
            startAt,
            endAt,
          });

          return {
            classScheduleId: schedule.id,
            instructorMembershipId: schedule.instructorMembershipId,
            title: schedule.title,
            classType: schedule.classType,
            scheduledDateIso: scheduledDate,
            scheduledDate: this.classesPolicy.parseIsoDate(scheduledDate),
            startAt,
            endAt,
            capacity: schedule.capacity ?? undefined,
          };
        }),
    );

    const result = await this.classesRepository.generateClassSessionsFromSchedules({
      organizationId,
      branchId,
      candidates,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'class_session.bulk_generated_missing_from_schedules',
      entityType: 'Branch',
      entityId: branchId,
      metadata: {
        fromDate: dto.fromDate,
        toDate: dto.toDate,
        processedSchedules: schedules.length,
        missingCandidateCount: candidates.length,
        generatedCount: result.generatedCount,
        skippedExistingCount: result.skippedExistingCount,
        skippedConflictCount: result.skippedConflictCount,
      },
    });

    return {
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      processedSchedules: schedules.length,
      missingCandidateCount: candidates.length,
      generatedCount: result.generatedCount,
      skippedExistingCount: result.skippedExistingCount,
      skippedConflictCount: result.skippedConflictCount,
    };
  }
}
