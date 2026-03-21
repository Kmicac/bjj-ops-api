import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { CreateClassSessionDto } from '../../dto/create-class-session.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class CreateClassSessionUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    dto: CreateClassSessionDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanCreateSession(principal, organizationId, branch);

    if (dto.classScheduleId) {
      await this.classesRepository.getClassScheduleById(
        organizationId,
        branchId,
        dto.classScheduleId,
      );
    }

    const instructor = await this.classesRepository.findInstructorCandidate({
      organizationId,
      branchId,
      membershipId: dto.instructorMembershipId,
    });
    this.classesPolicy.ensureValidInstructorCandidate(instructor);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.classesPolicy.ensureValidSessionTimeWindow({
      branchTimezone: branch.timezone,
      scheduledDate: dto.scheduledDate,
      startAt,
      endAt,
    });

    const session =
      await this.classesRepository.createClassSessionWithConsistencyChecks({
      organizationId,
      branchId,
      classScheduleId: dto.classScheduleId,
      instructorMembershipId: dto.instructorMembershipId,
      title: dto.title.trim(),
      classType: dto.classType,
      scheduledDateIso: dto.scheduledDate,
      scheduledDate: this.classesPolicy.parseIsoDate(dto.scheduledDate),
      startAt,
      endAt,
      capacity: dto.capacity,
      notes: dto.notes?.trim(),
      enforceScheduleDateUniqueness: Boolean(dto.classScheduleId),
      enforceOverlapValidation: true,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'class_session.created',
      entityType: 'ClassSession',
      entityId: session.id,
      metadata: {
        classScheduleId: session.classScheduleId,
        scheduledDate: dto.scheduledDate,
        status: session.status,
        overlapChecks: {
          branch: true,
          instructor: true,
        },
      },
    });

    return session;
  }
}
