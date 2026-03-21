import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessControlService } from '../../auth/access-control.service';
import type { AuthenticatedPrincipal } from '../../auth/authenticated-principal.interface';
import {
  ClassSessionStatus,
  MembershipRole,
  Weekday,
} from '../../generated/prisma/enums';
import { ClassCalendarView } from '../dto/get-class-calendar-view.query.dto';

type BranchAccessTarget = {
  id: string;
  organizationId: string;
  headCoachMembershipId: string | null;
  timezone: string;
};

type InstructorCandidate = {
  assignedRoles: MembershipRole[];
};

type ScheduleSpawnTarget = {
  isActive: boolean;
  weekday: Weekday;
};

type SessionOverlapConflict = {
  id: string;
};

const ALLOWED_INSTRUCTOR_ROLES = new Set<MembershipRole>([
  MembershipRole.MESTRE,
  MembershipRole.ORG_ADMIN,
  MembershipRole.ACADEMY_MANAGER,
  MembershipRole.INSTRUCTOR,
]);
const MAX_SESSION_GENERATION_RANGE_DAYS = 42;

@Injectable()
export class ClassesPolicy {
  constructor(private readonly accessControl: AccessControlService) {}

  ensureCanCreateSchedule(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureCanListSchedules(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureCanUpdateSchedule(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureHeadCoachBranchAccess(principal, organizationId, branch);
  }

  ensureCanCreateSession(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureCanGenerateSessions(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureHeadCoachBranchAccess(principal, organizationId, branch);
  }

  ensureCanListSessions(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureCanViewSessionGaps(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureStaffBranchAccess(principal, organizationId, branch);
  }

  ensureCanUpdateSession(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.ensureHeadCoachBranchAccess(principal, organizationId, branch);
  }

  ensureValidInstructorCandidate(candidate: InstructorCandidate | null) {
    if (!candidate) {
      throw new NotFoundException(
        'Instructor membership not found for branch assignment',
      );
    }

    if (
      !candidate.assignedRoles.some((role) => ALLOWED_INSTRUCTOR_ROLES.has(role))
    ) {
      throw new ConflictException(
        'Instructor membership must be instructional or organizational leadership',
      );
    }
  }

  ensureScheduleCanSpawnSession(schedule: ScheduleSpawnTarget) {
    if (!schedule.isActive) {
      throw new ConflictException(
        'Inactive schedules cannot create class sessions',
      );
    }
  }

  ensureNoScheduleSessionConflict(existingSession: { id: string } | null) {
    if (existingSession) {
      throw new ConflictException(
        'A class session already exists for this schedule on the selected date',
      );
    }
  }

  ensureNoBranchSessionOverlap(conflicts: SessionOverlapConflict[]) {
    if (conflicts.length > 0) {
      throw new ConflictException(
        'Branch already has another class session scheduled in the same time window',
      );
    }
  }

  ensureNoInstructorSessionOverlap(conflicts: SessionOverlapConflict[]) {
    if (conflicts.length > 0) {
      throw new ConflictException(
        'Instructor already has another class session scheduled in the same time window',
      );
    }
  }

  ensureValidScheduleTimeWindow(startTime: string, endTime: string) {
    if (endTime <= startTime) {
      throw new ConflictException('endTime must be later than startTime');
    }
  }

  ensureValidSessionDateRange(fromDate?: string, toDate?: string) {
    if (!fromDate && !toDate) {
      return;
    }

    if (!fromDate || !toDate) {
      throw new ConflictException(
        'fromDate and toDate must be provided together',
      );
    }

    if (toDate < fromDate) {
      throw new ConflictException('toDate must be on or after fromDate');
    }
  }

  ensureValidGenerationDateRange(fromDate: string, toDate: string) {
    this.ensureValidSessionDateRange(fromDate, toDate);

    const start = this.parseIsoDate(fromDate);
    const end = this.parseIsoDate(toDate);
    const totalDays =
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    if (totalDays > MAX_SESSION_GENERATION_RANGE_DAYS) {
      throw new ConflictException(
        `Generation range cannot exceed ${MAX_SESSION_GENERATION_RANGE_DAYS} days`,
      );
    }
  }

  ensureValidSessionGapRange(fromDate: string, toDate: string) {
    this.ensureValidGenerationDateRange(fromDate, toDate);
  }

  ensureScheduledDateMatchesWeekday(scheduledDate: string, weekday: Weekday) {
    if (this.getWeekdayForIsoDate(scheduledDate) !== weekday) {
      throw new ConflictException(
        'scheduledDate does not match the schedule weekday',
      );
    }
  }

  parseIsoDate(isoDate: string) {
    return new Date(`${isoDate}T00:00:00.000Z`);
  }

  buildCalendarRange(startDate: string, view: ClassCalendarView) {
    const start = this.parseIsoDate(startDate);
    const totalDays = view === ClassCalendarView.WEEK ? 7 : 1;
    const days = Array.from({ length: totalDays }, (_, index) =>
      this.formatIsoDate(this.addDays(start, index)),
    );

    return {
      fromDate: days[0],
      toDate: days[days.length - 1],
      days,
    };
  }

  listScheduledDatesForWeekdayInRange(params: {
    fromDate: string;
    toDate: string;
    weekday: Weekday;
  }) {
    const start = this.parseIsoDate(params.fromDate);
    const end = this.parseIsoDate(params.toDate);
    const dates: string[] = [];

    for (
      let cursor = start;
      cursor.getTime() <= end.getTime();
      cursor = this.addDays(cursor, 1)
    ) {
      const isoDate = this.formatIsoDate(cursor);

      if (this.getWeekdayForIsoDate(isoDate) === params.weekday) {
        dates.push(isoDate);
      }
    }

    return dates;
  }

  buildSessionTimestampFromSchedule(params: {
    scheduledDate: string;
    localTime: string;
    timeZone: string;
  }) {
    const [year, month, day] = params.scheduledDate
      .split('-')
      .map((value) => Number(value));
    const [hour, minute] = params.localTime
      .split(':')
      .map((value) => Number(value));

    const guessUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    let offset = this.getTimeZoneOffsetMs(new Date(guessUtc), params.timeZone);
    let result = new Date(guessUtc - offset);
    const normalizedOffset = this.getTimeZoneOffsetMs(result, params.timeZone);

    if (normalizedOffset !== offset) {
      offset = normalizedOffset;
      result = new Date(guessUtc - offset);
    }

    return result;
  }

  ensureValidSessionTimeWindow(params: {
    branchTimezone: string;
    scheduledDate: string;
    startAt: Date;
    endAt: Date;
  }) {
    if (params.endAt.getTime() <= params.startAt.getTime()) {
      throw new ConflictException('endAt must be later than startAt');
    }

    const localDate = this.formatDateInTimezone(
      params.startAt,
      params.branchTimezone,
    );

    if (localDate !== params.scheduledDate) {
      throw new ConflictException(
        'scheduledDate must match the session start date in the branch timezone',
      );
    }
  }

  normalizeCancellation(params: {
    status: ClassSessionStatus;
    cancellationReason?: string | null;
  }) {
    const cancellationReason = params.cancellationReason?.trim() || null;

    if (params.status === ClassSessionStatus.CANCELED) {
      if (!cancellationReason) {
        throw new ConflictException(
          'cancellationReason is required when canceling a class session',
        );
      }

      return cancellationReason;
    }

    if (cancellationReason) {
      throw new ConflictException(
        'cancellationReason is only allowed for canceled sessions',
      );
    }

    return null;
  }

  private ensureStaffBranchAccess(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
    this.accessControl.ensureBranchAccess(principal, branch, MembershipRole.STAFF);
  }

  private ensureHeadCoachBranchAccess(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branch: BranchAccessTarget,
  ) {
    this.accessControl.ensureOrganizationAccess(principal, organizationId);
    this.accessControl.ensureBranchAccess(
      principal,
      branch,
      MembershipRole.HEAD_COACH,
    );
  }

  private formatDateInTimezone(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(date);
  }

  private formatIsoDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private getWeekdayForIsoDate(isoDate: string) {
    const date = new Date(`${isoDate}T12:00:00.000Z`);
    const weekdayByDayIndex: Weekday[] = [
      Weekday.SUNDAY,
      Weekday.MONDAY,
      Weekday.TUESDAY,
      Weekday.WEDNESDAY,
      Weekday.THURSDAY,
      Weekday.FRIDAY,
      Weekday.SATURDAY,
    ];

    return weekdayByDayIndex[date.getUTCDay()];
  }

  private getTimeZoneOffsetMs(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const parts = Object.fromEntries(
      formatter
        .formatToParts(date)
        .filter(({ type }) => type !== 'literal')
        .map(({ type, value }) => [type, value]),
    );

    const zonedTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );

    return zonedTime - date.getTime();
  }
}
