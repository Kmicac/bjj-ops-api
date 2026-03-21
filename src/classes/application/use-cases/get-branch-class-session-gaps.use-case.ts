import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { GetClassSessionGapsQueryDto } from '../../dto/get-class-session-gaps.query.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class GetBranchClassSessionGapsUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    query: GetClassSessionGapsQueryDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanViewSessionGaps(
      principal,
      organizationId,
      branch,
    );
    this.classesPolicy.ensureValidSessionGapRange(
      query.fromDate,
      query.toDate,
    );

    const [schedules, sessions] = await Promise.all([
      this.classesRepository.listActiveClassScheduleSnapshots(
        organizationId,
        branchId,
      ),
      this.classesRepository.listBranchClassSessionsInRange({
        organizationId,
        branchId,
        fromDate: query.fromDate,
        toDate: query.toDate,
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

    const missingItems = schedules.flatMap((schedule) =>
      this.classesPolicy
        .listScheduledDatesForWeekdayInRange({
          fromDate: query.fromDate,
          toDate: query.toDate,
          weekday: schedule.weekday,
        })
        .filter(
          (scheduledDate) =>
            !materializedSessionKeys.has(`${schedule.id}:${scheduledDate}`),
        )
        .map((scheduledDate) => ({
          date: scheduledDate,
          scheduleId: schedule.id,
          title: schedule.title,
          classType: schedule.classType,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          instructorMembershipId: schedule.instructorMembershipId,
          instructor: schedule.instructorMembership.user,
        })),
    );

    const days = [...new Set(missingItems.map((item) => item.date))].map(
      (date) => ({
        date,
        items: missingItems
          .filter((item) => item.date === date)
          .sort((left, right) =>
            left.startTime === right.startTime
              ? left.title.localeCompare(right.title)
              : left.startTime.localeCompare(right.startTime),
          ),
      }),
    );

    return {
      fromDate: query.fromDate,
      toDate: query.toDate,
      summary: {
        activeSchedules: schedules.length,
        materializedSessions: materializedSessionKeys.size,
        missingSessions: missingItems.length,
      },
      days,
    };
  }
}
