import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { ClassCalendarView, GetClassCalendarViewQueryDto } from '../../dto/get-class-calendar-view.query.dto';
import { ClassesPolicy } from '../../domain/classes.policy';
import { ClassesRepository } from '../../infrastructure/classes.repository';

@Injectable()
export class GetBranchClassCalendarViewUseCase {
  constructor(
    private readonly classesPolicy: ClassesPolicy,
    private readonly classesRepository: ClassesRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    branchId: string,
    query: GetClassCalendarViewQueryDto,
  ) {
    const branch = await this.classesRepository.getBranchAccessTarget(
      organizationId,
      branchId,
    );
    this.classesPolicy.ensureCanListSessions(principal, organizationId, branch);

    const range = this.classesPolicy.buildCalendarRange(
      query.startDate,
      query.view,
    );

    const items = await this.classesRepository.listBranchClassSessionsInRange({
      organizationId,
      branchId,
      fromDate: range.fromDate,
      toDate: range.toDate,
    });

    const days = range.days.map((date) => ({
      date,
      items: items.filter(
        (item) => item.scheduledDate.toISOString().slice(0, 10) === date,
      ),
    }));

    return {
      view: query.view,
      startDate: range.fromDate,
      endDate: range.toDate,
      days,
    };
  }
}
