import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  MembershipStatus,
  PromotionRank,
  PromotionTrack,
  StudentStatus,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const studentMutationSelect = {
  id: true,
  organizationId: true,
  primaryBranchId: true,
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  dateOfBirth: true,
  status: true,
  promotionTrack: true,
  startedBjjAt: true,
  joinedOrganizationAt: true,
  currentBelt: true,
  currentStripes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentSelect;

const studentListSelect = {
  id: true,
  organizationId: true,
  primaryBranchId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  status: true,
  promotionTrack: true,
  currentBelt: true,
  currentStripes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentSelect;

@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBranchAccessTarget(organizationId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        headCoachMembershipId: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async assertLinkedUserBelongsToOrganization(
    organizationId: string,
    userId: string,
  ) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        userId,
        status: {
          in: [MembershipStatus.ACTIVE, MembershipStatus.INVITED],
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new ConflictException(
        'Linked user must already belong to the same organization',
      );
    }
  }

  async createStudent(params: {
    organizationId: string;
    primaryBranchId: string;
    userId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
    startedBjjAt?: Date;
    joinedOrganizationAt?: Date;
    promotionTrack: PromotionTrack;
    currentBelt?: PromotionRank;
    currentStripes: number;
  }) {
    try {
      return await this.prisma.student.create({
        data: {
          organizationId: params.organizationId,
          primaryBranchId: params.primaryBranchId,
          userId: params.userId,
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          phone: params.phone,
          dateOfBirth: params.dateOfBirth,
          startedBjjAt: params.startedBjjAt,
          joinedOrganizationAt: params.joinedOrganizationAt,
          promotionTrack: params.promotionTrack,
          currentBelt: params.currentBelt,
          currentStripes: params.currentStripes,
          status: StudentStatus.ACTIVE,
        },
        select: studentMutationSelect,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'User is already linked to another student in the organization',
        );
      }

      throw error;
    }
  }

  async listStudentsByPrimaryBranch(params: {
    organizationId: string;
    branchId: string;
    skip: number;
    take: number;
  }) {
    const where = {
      organizationId: params.organizationId,
      primaryBranchId: params.branchId,
      deletedAt: null,
    } satisfies Prisma.StudentWhereInput;

    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: studentListSelect,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { items, total };
  }

  async getStudentDetailForVisibility(
    organizationId: string,
    studentId: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        organizationId,
        deletedAt: null,
      },
      select: {
        ...studentMutationSelect,
        primaryBranch: {
          select: {
            id: true,
            organizationId: true,
            headCoachMembershipId: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async updateStudent(params: {
    studentId: string;
    primaryBranchId?: string;
    userId?: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
    startedBjjAt?: Date;
    joinedOrganizationAt?: Date;
    promotionTrack?: PromotionTrack;
    currentBelt?: PromotionRank;
    currentStripes?: number;
  }) {
    try {
      return await this.prisma.student.update({
        where: {
          id: params.studentId,
        },
        data: {
          primaryBranchId: params.primaryBranchId,
          userId: params.userId,
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          phone: params.phone,
          dateOfBirth: params.dateOfBirth,
          startedBjjAt: params.startedBjjAt,
          joinedOrganizationAt: params.joinedOrganizationAt,
          promotionTrack: params.promotionTrack,
          currentBelt: params.currentBelt,
          currentStripes: params.currentStripes,
        },
        select: studentMutationSelect,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'User is already linked to another student in the organization',
        );
      }

      throw error;
    }
  }
}
