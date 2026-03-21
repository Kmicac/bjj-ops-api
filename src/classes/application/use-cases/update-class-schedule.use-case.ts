import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { AuditService } from '../../../audit/audit.service';
import { UpdateClassScheduleDto } from '../../dto/update-class-schedule.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class UpdateClassScheduleUseCase {
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
    dto: UpdateClassScheduleDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanUpdateSchedule(principal, organizationId, branch);

    const existingSchedule = await this.classesRepository.getClassScheduleById(
      organizationId,
      branchId,
      scheduleId,
    );

    const instructorMembershipId =
      dto.instructorMembershipId ?? existingSchedule.instructorMembershipId;
    const title = dto.title?.trim() ?? existingSchedule.title;
    const description =
      dto.description !== undefined
        ? dto.description?.trim() || null
        : existingSchedule.description;
    const startTime = dto.startTime ?? existingSchedule.startTime;
    const endTime = dto.endTime ?? existingSchedule.endTime;

    this.classesPolicy.ensureValidScheduleTimeWindow(startTime, endTime);

    if (
      instructorMembershipId !== existingSchedule.instructorMembershipId
    ) {
      const instructor = await this.classesRepository.findInstructorCandidate({
        organizationId,
        branchId,
        membershipId: instructorMembershipId,
      });
      this.classesPolicy.ensureValidInstructorCandidate(instructor);
    }

    const updatedSchedule = await this.classesRepository.updateClassSchedule({
      scheduleId,
      instructorMembershipId:
        dto.instructorMembershipId !== undefined
          ? instructorMembershipId
          : undefined,
      title: dto.title !== undefined ? title : undefined,
      classType: dto.classType,
      description: dto.description !== undefined ? description : undefined,
      weekday: dto.weekday,
      startTime: dto.startTime !== undefined ? startTime : undefined,
      endTime: dto.endTime !== undefined ? endTime : undefined,
      timezone: dto.timezone?.trim(),
      capacity:
        dto.capacity !== undefined ? dto.capacity ?? null : undefined,
      isActive: dto.isActive,
    });

    await this.auditService.create({
      organizationId,
      branchId,
      actorUserId: principal.sub,
      actorMembershipId: principal.membershipId,
      action: 'class_schedule.updated',
      entityType: 'ClassSchedule',
      entityId: scheduleId,
      metadata: {
        previousInstructorMembershipId: existingSchedule.instructorMembershipId,
        newInstructorMembershipId: updatedSchedule.instructorMembershipId,
        previousIsActive: existingSchedule.isActive,
        newIsActive: updatedSchedule.isActive,
      },
    });

    return updatedSchedule;
  }
}
