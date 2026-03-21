import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { ClassSessionStatus } from '../../../generated/prisma/enums';
import { UpdateClassSessionDto } from '../../dto/update-class-session.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class UpdateClassSessionUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    sessionId: string,
    dto: UpdateClassSessionDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanUpdateSession(principal, organizationId, branch);

    const existingSession = await this.classesRepository.getClassSessionById(
      organizationId,
      branchId,
      sessionId,
    );

    const instructorMembershipId =
      dto.instructorMembershipId ?? existingSession.instructorMembershipId;
    const status = dto.status ?? existingSession.status;
    const notes =
      dto.notes !== undefined ? dto.notes?.trim() || null : existingSession.notes;
    const startAt = dto.startAt ? new Date(dto.startAt) : existingSession.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existingSession.endAt;
    const scheduledDate = dto.scheduledDate
      ? dto.scheduledDate
      : existingSession.scheduledDate.toISOString().slice(0, 10);

    this.classesPolicy.ensureValidSessionTimeWindow({
      branchTimezone: branch.timezone,
      scheduledDate,
      startAt,
      endAt,
    });

    const cancellationReason = this.classesPolicy.normalizeCancellation({
      status,
      cancellationReason:
        dto.cancellationReason !== undefined
          ? dto.cancellationReason
          : existingSession.cancellationReason,
    });

    if (
      instructorMembershipId !== existingSession.instructorMembershipId
    ) {
      const instructor = await this.classesRepository.findInstructorCandidate({
        organizationId,
        branchId,
        membershipId: instructorMembershipId,
      });
      this.classesPolicy.ensureValidInstructorCandidate(instructor);
    }

    const shouldEnforceOperationalConflicts =
      status !== ClassSessionStatus.CANCELED;

    const updatedSession = await this.classesRepository.updateClassSession({
      organizationId,
      branchId,
      sessionId,
      classScheduleId: existingSession.classScheduleId,
      instructorMembershipId,
      title: dto.title !== undefined ? dto.title.trim() : undefined,
      classType: dto.classType,
      scheduledDateIso: scheduledDate,
      scheduledDate:
        dto.scheduledDate !== undefined
          ? new Date(`${scheduledDate}T00:00:00.000Z`)
          : undefined,
      startAt,
      endAt,
      capacity:
        dto.capacity !== undefined ? dto.capacity ?? null : undefined,
      status: dto.status ?? undefined,
      cancellationReason:
        dto.status !== undefined || dto.cancellationReason !== undefined
          ? cancellationReason
          : undefined,
      notes: dto.notes !== undefined ? notes : undefined,
      enforceScheduleDateUniqueness:
        shouldEnforceOperationalConflicts && Boolean(existingSession.classScheduleId),
      enforceOverlapValidation: shouldEnforceOperationalConflicts,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action:
        status === ClassSessionStatus.CANCELED &&
        existingSession.status !== ClassSessionStatus.CANCELED
          ? 'class_session.canceled'
          : 'class_session.updated',
      entityType: 'ClassSession',
      entityId: sessionId,
      metadata: {
        previousStatus: existingSession.status,
        newStatus: updatedSession.status,
        previousInstructorMembershipId: existingSession.instructorMembershipId,
        newInstructorMembershipId: updatedSession.instructorMembershipId,
        overlapChecks: {
          branch: true,
          instructor: true,
        },
      },
    });

    return updatedSession;
  }
}
