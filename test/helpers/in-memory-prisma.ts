import * as argon2 from 'argon2';
import {
  BranchStatus,
  MembershipRole,
  MembershipScopeType,
  MembershipStatus,
  OrganizationStatus,
  StudentStatus,
  UserStatus,
} from '../../src/generated/prisma/enums';

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultTimezone: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type BranchRecord = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  countryCode: string;
  region: string | null;
  city: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  timezone: string;
  headCoachMembershipId: string | null;
  status: BranchStatus;
  isPublicListed: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type BranchPublicProfileRecord = {
  id: string;
  organizationId: string;
  branchId: string;
  displayName: string | null;
  shortBio: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  tiktok: string | null;
  website: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MembershipRecord = {
  id: string;
  organizationId: string;
  userId: string;
  status: MembershipStatus;
  scopeType: MembershipScopeType;
  primaryBranchId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MembershipRoleAssignmentRecord = {
  id: string;
  organizationId: string;
  membershipId: string;
  role: MembershipRole;
  createdAt: Date;
};

type MembershipBranchScopeRecord = {
  id: string;
  organizationId: string;
  membershipId: string;
  branchId: string;
  createdAt: Date;
};

type StudentRecord = {
  id: string;
  organizationId: string;
  primaryBranchId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  status: StudentStatus;
  startedBjjAt: Date | null;
  joinedOrganizationAt: Date | null;
  currentBelt: string | null;
  currentStripes: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type AuditLogRecord = {
  id: string;
  organizationId: string;
  branchId: string | null;
  actorUserId: string | null;
  actorMembershipId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
};

type Store = {
  users: UserRecord[];
  organizations: OrganizationRecord[];
  branches: BranchRecord[];
  branchPublicProfiles: BranchPublicProfileRecord[];
  memberships: MembershipRecord[];
  membershipRoles: MembershipRoleAssignmentRecord[];
  membershipScopes: MembershipBranchScopeRecord[];
  students: StudentRecord[];
  auditLogs: AuditLogRecord[];
};

type SeedMembershipInput = {
  organizationId: string;
  userId: string;
  roles: MembershipRole[];
  scopeType?: MembershipScopeType;
  branchIds?: string[];
  primaryBranchId?: string | null;
  status?: MembershipStatus;
};

export class InMemoryPrismaService {
  private sequence = 0;
  private store: Store = {
    users: [],
    organizations: [],
    branches: [],
    branchPublicProfiles: [],
    memberships: [],
    membershipRoles: [],
    membershipScopes: [],
    students: [],
    auditLogs: [],
  };

  readonly organization = {
    count: async (args?: { where?: any }) =>
      this.store.organizations.filter((item) => this.matchesOrganization(item, args?.where))
        .length,
    create: async ({ data }: { data: any }) => {
      const organization: OrganizationRecord = {
        id: this.nextId('org'),
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        defaultTimezone: data.defaultTimezone,
        status: data.status ?? OrganizationStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.store.organizations.push(organization);
      return this.clone(organization);
    },
    findUnique: async ({ where }: { where: any }) => {
      const organization = this.store.organizations.find(
        (item) =>
          (where.id && item.id === where.id) ||
          (where.slug && item.slug === where.slug),
      );
      return organization ? this.clone(organization) : null;
    },
    findFirst: async ({ where, select }: { where: any; select?: any }) => {
      const organization = this.store.organizations.find((item) =>
        this.matchesOrganization(item, where),
      );
      if (!organization) {
        return null;
      }
      return this.pickOrganization(organization, select);
    },
    findMany: async ({ where, skip = 0, take, orderBy, select }: any) => {
      let items = this.store.organizations.filter((item) =>
        this.matchesOrganization(item, where),
      );
      if (orderBy?.createdAt === 'desc') {
        items = [...items].sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        );
      }
      const sliced = items.slice(skip, take ? skip + take : undefined);
      return sliced.map((item) => this.pickOrganization(item, select));
    },
    updateMany: async ({ where, data }: { where: any; data: any }) => {
      let count = 0;
      this.store.organizations = this.store.organizations.map((item) => {
        if (!this.matchesOrganization(item, where)) {
          return item;
        }
        count += 1;
        return {
          ...item,
          ...data,
          updatedAt: new Date(),
        };
      });
      return { count };
    },
  };

  readonly branch = {
    create: async ({ data, select }: { data: any; select?: any }) => {
      const branch: BranchRecord = {
        id: this.nextId('branch'),
        organizationId: data.organizationId,
        name: data.name,
        slug: data.slug,
        countryCode: data.countryCode,
        region: data.region ?? null,
        city: data.city,
        addressLine1: data.addressLine1 ?? null,
        addressLine2: data.addressLine2 ?? null,
        postalCode: data.postalCode ?? null,
        timezone: data.timezone,
        headCoachMembershipId: data.headCoachMembershipId ?? null,
        status: data.status ?? BranchStatus.DRAFT,
        isPublicListed: data.isPublicListed ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.store.branches.push(branch);

      if (data.publicProfile?.create) {
        this.createBranchPublicProfile({
          organizationId: branch.organizationId,
          branchId: branch.id,
          ...data.publicProfile.create,
        });
      }

      return this.pickBranch(branch, select);
    },
    findFirst: async ({ where, select }: { where: any; select?: any }) => {
      const branch = this.store.branches.find((item) => this.matchesBranch(item, where));
      return branch ? this.pickBranch(branch, select) : null;
    },
    findMany: async ({ where, skip = 0, take, orderBy, select }: any) => {
      let items = this.store.branches.filter((item) => this.matchesBranch(item, where));
      if (Array.isArray(orderBy)) {
        items = [...items].sort((left, right) => {
          for (const rule of orderBy) {
            const [field, direction] = Object.entries(rule)[0] as [string, 'asc' | 'desc'];
            const leftValue = String((left as any)[field] ?? '');
            const rightValue = String((right as any)[field] ?? '');
            if (leftValue === rightValue) {
              continue;
            }
            return direction === 'asc'
              ? leftValue.localeCompare(rightValue)
              : rightValue.localeCompare(leftValue);
          }
          return 0;
        });
      }
      const sliced = items.slice(skip, take ? skip + take : undefined);
      return sliced.map((item) => this.pickBranch(item, select));
    },
    count: async ({ where }: { where: any }) =>
      this.store.branches.filter((item) => this.matchesBranch(item, where)).length,
    update: async ({ where, data, select }: { where: any; data: any; select?: any }) => {
      const branchIndex = this.store.branches.findIndex((item) => item.id === where.id);
      if (branchIndex < 0) {
        throw new Error('Branch not found');
      }

      const current = this.store.branches[branchIndex];
      const updated: BranchRecord = {
        ...current,
        ...Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined && value !== null),
        ),
        updatedAt: new Date(),
      };

      if (data.headCoachMembershipId !== undefined) {
        updated.headCoachMembershipId = data.headCoachMembershipId;
      }
      if (data.region !== undefined) {
        updated.region = data.region;
      }
      if (data.addressLine1 !== undefined) {
        updated.addressLine1 = data.addressLine1;
      }
      if (data.addressLine2 !== undefined) {
        updated.addressLine2 = data.addressLine2;
      }
      if (data.postalCode !== undefined) {
        updated.postalCode = data.postalCode;
      }

      this.store.branches[branchIndex] = updated;

      if (data.publicProfile?.upsert) {
        const existing = this.store.branchPublicProfiles.find(
          (item) => item.branchId === updated.id,
        );
        if (existing) {
          Object.assign(existing, {
            ...existing,
            ...data.publicProfile.upsert.update,
            updatedAt: new Date(),
          });
        } else {
          this.createBranchPublicProfile({
            organizationId: updated.organizationId,
            branchId: updated.id,
            ...data.publicProfile.upsert.create,
          });
        }
      }

      return this.pickBranch(updated, select);
    },
  };

  readonly user = {
    count: async () => this.store.users.length,
    create: async ({ data }: { data: any }) => {
      const user: UserRecord = {
        id: this.nextId('user'),
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        status: data.status ?? UserStatus.ACTIVE,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        lastLoginAt: data.lastLoginAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.store.users.push(user);
      return this.clone(user);
    },
    findUnique: async ({ where }: { where: any }) => {
      const user = this.store.users.find(
        (item) =>
          (where.id && item.id === where.id) ||
          (where.email && item.email === where.email),
      );
      return user ? this.clone(user) : null;
    },
    findFirst: async ({ where, include }: { where: any; include?: any }) => {
      const user = this.store.users.find((item) => this.matchesUser(item, where));
      if (!user) {
        return null;
      }

      if (!include?.memberships) {
        return this.clone(user);
      }

      const memberships = this.store.memberships
        .filter((membership) => membership.userId === user.id)
        .filter((membership) => this.matchesMembership(membership, include.memberships.where))
        .map((membership) => this.buildMembership(membership, include.memberships.include));

      return {
        ...this.clone(user),
        memberships,
      };
    },
    update: async ({ where, data }: { where: any; data: any }) => {
      const user = this.store.users.find((item) => item.id === where.id);
      if (!user) {
        throw new Error('User not found');
      }
      Object.assign(user, data, { updatedAt: new Date() });
      return this.clone(user);
    },
  };

  readonly organizationMembership = {
    create: async ({ data, include, select }: { data: any; include?: any; select?: any }) => {
      const membership: MembershipRecord = {
        id: this.nextId('membership'),
        organizationId: data.organizationId,
        userId: data.userId,
        status: data.status ?? MembershipStatus.INVITED,
        scopeType: data.scopeType ?? MembershipScopeType.SELECTED_BRANCHES,
        primaryBranchId: data.primaryBranchId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.store.memberships.push(membership);

      for (const roleData of data.roles?.create ?? []) {
        this.store.membershipRoles.push({
          id: this.nextId('mrole'),
          organizationId: membership.organizationId,
          membershipId: membership.id,
          role: roleData.role,
          createdAt: new Date(),
        });
      }

      for (const scopeData of data.branchScopes?.create ?? []) {
        this.store.membershipScopes.push({
          id: this.nextId('mscope'),
          organizationId: membership.organizationId,
          membershipId: membership.id,
          branchId: scopeData.branchId,
          createdAt: new Date(),
        });
      }

      if (include) {
        return this.buildMembership(membership, include);
      }

      if (select) {
        return this.pickMembership(membership, select);
      }

      return this.clone(membership);
    },
    findUniqueOrThrow: async ({ where, include }: { where: any; include?: any }) => {
      const membership = this.store.memberships.find((item) => item.id === where.id);
      if (!membership) {
        throw new Error('Membership not found');
      }
      return this.buildMembership(membership, include);
    },
    findFirst: async ({ where, include, select }: { where: any; include?: any; select?: any }) => {
      const membership = this.store.memberships.find((item) =>
        this.matchesMembership(item, where),
      );
      if (!membership) {
        return null;
      }
      if (include) {
        return this.buildMembership(membership, include);
      }
      if (select) {
        return this.pickMembership(membership, select);
      }
      return this.clone(membership);
    },
    findMany: async ({ where, skip = 0, take, orderBy, select, include }: any) => {
      let items = this.store.memberships.filter((item) =>
        this.matchesMembership(item, where),
      );
      if (orderBy?.createdAt === 'desc') {
        items = [...items].sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        );
      }
      const sliced = items.slice(skip, take ? skip + take : undefined);
      return sliced.map((item) =>
        include ? this.buildMembership(item, include) : this.pickMembership(item, select),
      );
    },
    count: async ({ where }: { where: any }) =>
      this.store.memberships.filter((item) => this.matchesMembership(item, where)).length,
    update: async ({ where, data }: { where: any; data: any }) => {
      const membership = this.store.memberships.find((item) => item.id === where.id);
      if (!membership) {
        throw new Error('Membership not found');
      }
      Object.assign(membership, {
        scopeType: data.scopeType ?? membership.scopeType,
        primaryBranchId:
          data.primaryBranchId !== undefined
            ? data.primaryBranchId
            : membership.primaryBranchId,
        updatedAt: new Date(),
      });

      if (data.branchScopes?.create) {
        for (const scopeData of data.branchScopes.create) {
          this.store.membershipScopes.push({
            id: this.nextId('mscope'),
            organizationId: membership.organizationId,
            membershipId: membership.id,
            branchId: scopeData.branchId,
            createdAt: new Date(),
          });
        }
      }

      return this.clone(membership);
    },
  };

  readonly membershipRoleAssignment = {
    deleteMany: async ({ where }: { where: any }) => {
      this.store.membershipRoles = this.store.membershipRoles.filter(
        (item) => item.membershipId !== where.membershipId,
      );
      return { count: 0 };
    },
    createMany: async ({ data }: { data: any[] }) => {
      for (const item of data) {
        this.store.membershipRoles.push({
          id: this.nextId('mrole'),
          organizationId: item.organizationId,
          membershipId: item.membershipId,
          role: item.role,
          createdAt: new Date(),
        });
      }
      return { count: data.length };
    },
  };

  readonly membershipBranchScope = {
    deleteMany: async ({ where }: { where: any }) => {
      this.store.membershipScopes = this.store.membershipScopes.filter(
        (item) => item.membershipId !== where.membershipId,
      );
      return { count: 0 };
    },
  };

  readonly student = {
    create: async ({ data, select }: { data: any; select?: any }) => {
      const student: StudentRecord = {
        id: this.nextId('student'),
        organizationId: data.organizationId,
        primaryBranchId: data.primaryBranchId,
        userId: data.userId ?? null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        status: data.status ?? StudentStatus.ACTIVE,
        startedBjjAt: data.startedBjjAt ?? null,
        joinedOrganizationAt: data.joinedOrganizationAt ?? null,
        currentBelt: data.currentBelt ?? null,
        currentStripes: data.currentStripes ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.ensureStudentUserUnique(student.organizationId, student.userId, student.id);
      this.store.students.push(student);
      return this.pickStudent(student, select);
    },
    findFirst: async ({ where, select }: { where: any; select?: any }) => {
      const student = this.store.students.find((item) => this.matchesStudent(item, where));
      return student ? this.pickStudent(student, select) : null;
    },
    findMany: async ({ where, skip = 0, take, orderBy, select }: any) => {
      let items = this.store.students.filter((item) => this.matchesStudent(item, where));
      if (Array.isArray(orderBy)) {
        items = [...items].sort((left, right) => {
          for (const rule of orderBy) {
            const [field, direction] = Object.entries(rule)[0] as [string, 'asc' | 'desc'];
            const leftValue = String((left as any)[field] ?? '');
            const rightValue = String((right as any)[field] ?? '');
            if (leftValue === rightValue) {
              continue;
            }
            return direction === 'asc'
              ? leftValue.localeCompare(rightValue)
              : rightValue.localeCompare(leftValue);
          }
          return 0;
        });
      }
      const sliced = items.slice(skip, take ? skip + take : undefined);
      return sliced.map((item) => this.pickStudent(item, select));
    },
    count: async ({ where }: { where: any }) =>
      this.store.students.filter((item) => this.matchesStudent(item, where)).length,
    update: async ({ where, data, select }: { where: any; data: any; select?: any }) => {
      const student = this.store.students.find((item) => item.id === where.id);
      if (!student) {
        throw new Error('Student not found');
      }
      const nextUserId =
        data.userId !== undefined ? data.userId : student.userId;
      this.ensureStudentUserUnique(student.organizationId, nextUserId, student.id);
      Object.assign(student, {
        ...Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined),
        ),
        updatedAt: new Date(),
      });
      return this.pickStudent(student, select);
    },
  };

  readonly auditLog = {
    create: async ({ data }: { data: any }) => {
      const log: AuditLogRecord = {
        id: this.nextId('audit'),
        organizationId: data.organizationId,
        branchId: data.branchId ?? null,
        actorUserId: data.actorUserId ?? null,
        actorMembershipId: data.actorMembershipId ?? null,
        requestId: data.requestId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata ?? null,
        createdAt: new Date(),
      };
      this.store.auditLogs.push(log);
      return this.clone(log);
    },
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>) {
    const snapshot = this.clone(this.store);
    try {
      return await callback(this);
    } catch (error) {
      this.store = snapshot;
      throw error;
    }
  }

  async seedUser(params: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status?: UserStatus;
  }) {
    const passwordHash = params.password
      ? await argon2.hash(params.password, {
          type: argon2.argon2id,
          memoryCost: 19_456,
          timeCost: 2,
          parallelism: 1,
        })
      : null;

    return this.user.create({
      data: {
        email: params.email.toLowerCase(),
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone ?? null,
        status: params.status ?? UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
  }

  async seedOrganization(params: {
    name: string;
    slug: string;
    description?: string;
    defaultTimezone?: string;
    status?: OrganizationStatus;
  }) {
    return this.organization.create({
      data: {
        name: params.name,
        slug: params.slug,
        description: params.description,
        defaultTimezone: params.defaultTimezone ?? 'America/Buenos_Aires',
        status: params.status ?? OrganizationStatus.ACTIVE,
      },
    });
  }

  async seedBranch(params: {
    organizationId: string;
    name: string;
    slug: string;
    countryCode: string;
    city: string;
    timezone: string;
    region?: string;
    status?: BranchStatus;
    isPublicListed?: boolean;
    headCoachMembershipId?: string | null;
    publicProfile?: Partial<BranchPublicProfileRecord> & { isPublished?: boolean };
  }) {
    return this.branch.create({
      data: {
        organizationId: params.organizationId,
        name: params.name,
        slug: params.slug,
        countryCode: params.countryCode,
        region: params.region ?? null,
        city: params.city,
        timezone: params.timezone,
        status: params.status ?? BranchStatus.ACTIVE,
        isPublicListed: params.isPublicListed ?? false,
        headCoachMembershipId: params.headCoachMembershipId ?? null,
        publicProfile: params.publicProfile
          ? {
              create: params.publicProfile,
            }
          : undefined,
      },
    });
  }

  async seedMembership(params: SeedMembershipInput) {
    return this.organizationMembership.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        status: params.status ?? MembershipStatus.ACTIVE,
        scopeType: params.scopeType ?? MembershipScopeType.ORGANIZATION_WIDE,
        primaryBranchId: params.primaryBranchId ?? null,
        roles: {
          create: params.roles.map((role) => ({ role })),
        },
        branchScopes:
          (params.scopeType ?? MembershipScopeType.ORGANIZATION_WIDE) ===
          MembershipScopeType.SELECTED_BRANCHES
            ? {
                create: (params.branchIds ?? []).map((branchId) => ({ branchId })),
              }
            : undefined,
      },
      include: {
        roles: true,
        branchScopes: true,
        organization: true,
        user: true,
      },
    });
  }

  async seedStudent(params: {
    organizationId: string;
    primaryBranchId: string;
    userId?: string | null;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    status?: StudentStatus;
  }) {
    return this.student.create({
      data: {
        organizationId: params.organizationId,
        primaryBranchId: params.primaryBranchId,
        userId: params.userId ?? null,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone,
        status: params.status ?? StudentStatus.ACTIVE,
        currentStripes: 0,
      },
    });
  }

  getAuditLogs() {
    return this.clone(this.store.auditLogs);
  }

  private matchesOrganization(item: OrganizationRecord, where?: any) {
    if (!where) {
      return true;
    }
    if (where.id && item.id !== where.id) {
      return false;
    }
    if (where.slug && item.slug !== where.slug) {
      return false;
    }
    if (where.deletedAt === null && item.deletedAt !== null) {
      return false;
    }
    if (where.status?.not && item.status === where.status.not) {
      return false;
    }
    if (where.status && typeof where.status === 'string' && item.status !== where.status) {
      return false;
    }
    if (where.memberships?.some) {
      const hasMembership = this.store.memberships.some(
        (membership) =>
          membership.organizationId === item.id &&
          (!where.memberships.some.userId ||
            membership.userId === where.memberships.some.userId) &&
          (!where.memberships.some.status ||
            membership.status === where.memberships.some.status),
      );
      if (!hasMembership) {
        return false;
      }
    }
    return true;
  }

  private matchesBranch(item: BranchRecord, where?: any) {
    if (!where) {
      return true;
    }
    if (where.id && item.id !== where.id) {
      return false;
    }
    if (where.organizationId && item.organizationId !== where.organizationId) {
      return false;
    }
    if (where.slug && item.slug !== where.slug) {
      return false;
    }
    if (where.deletedAt === null && item.deletedAt !== null) {
      return false;
    }
    if (where.countryCode && item.countryCode !== where.countryCode) {
      return false;
    }
    if (where.city?.contains) {
      if (
        !item.city
          .toLowerCase()
          .includes(String(where.city.contains).toLowerCase())
      ) {
        return false;
      }
    }
    if (where.primaryBranchId && item.id !== where.primaryBranchId) {
      return false;
    }
    if (where.isPublicListed !== undefined && item.isPublicListed !== where.isPublicListed) {
      return false;
    }
    if (where.status && typeof where.status === 'string' && item.status !== where.status) {
      return false;
    }
    if (where.organization) {
      const organization = this.store.organizations.find(
        (candidate) => candidate.id === item.organizationId,
      );
      if (!organization || !this.matchesOrganization(organization, where.organization)) {
        return false;
      }
    }
    if (where.publicProfile) {
      const publicProfile = this.store.branchPublicProfiles.find(
        (candidate) => candidate.branchId === item.id,
      );
      if (!publicProfile) {
        return false;
      }
      if (
        where.publicProfile.isPublished !== undefined &&
        publicProfile.isPublished !== where.publicProfile.isPublished
      ) {
        return false;
      }
    }
    return true;
  }

  private matchesUser(item: UserRecord, where?: any) {
    if (!where) {
      return true;
    }
    if (where.id && item.id !== where.id) {
      return false;
    }
    if (where.email && item.email !== where.email) {
      return false;
    }
    if (where.deletedAt === null && item.deletedAt !== null) {
      return false;
    }
    if (where.status && item.status !== where.status) {
      return false;
    }
    return true;
  }

  private matchesMembership(item: MembershipRecord, where?: any) {
    if (!where) {
      return true;
    }
    if (where.id && item.id !== where.id) {
      return false;
    }
    if (where.organizationId && item.organizationId !== where.organizationId) {
      return false;
    }
    if (where.userId && item.userId !== where.userId) {
      return false;
    }
    if (where.status && typeof where.status === 'string' && item.status !== where.status) {
      return false;
    }
    if (where.status?.in && !where.status.in.includes(item.status)) {
      return false;
    }
    if (
      where.organization &&
      !this.matchesOrganization(
        this.store.organizations.find((org) => org.id === item.organizationId)!,
        where.organization,
      )
    ) {
      return false;
    }
    if (where.user?.email) {
      const user = this.store.users.find((candidate) => candidate.id === item.userId);
      if (!user || user.email !== where.user.email) {
        return false;
      }
    }
    if (where.OR) {
      const matched = where.OR.some((condition: any) => {
        if (condition.primaryBranchId) {
          return item.primaryBranchId === condition.primaryBranchId;
        }
        if (condition.branchScopes?.some?.branchId) {
          return this.store.membershipScopes.some(
            (scope) =>
              scope.membershipId === item.id &&
              scope.branchId === condition.branchScopes.some.branchId,
          );
        }
        return false;
      });
      if (!matched) {
        return false;
      }
    }
    return true;
  }

  private matchesStudent(item: StudentRecord, where?: any) {
    if (!where) {
      return true;
    }
    if (where.id && item.id !== where.id) {
      return false;
    }
    if (where.organizationId && item.organizationId !== where.organizationId) {
      return false;
    }
    if (where.primaryBranchId && item.primaryBranchId !== where.primaryBranchId) {
      return false;
    }
    if (where.deletedAt === null && item.deletedAt !== null) {
      return false;
    }
    return true;
  }

  private buildMembership(item: MembershipRecord, include?: any) {
    const membership = this.clone(item) as any;
    if (include?.organization) {
      membership.organization = this.clone(
        this.store.organizations.find((candidate) => candidate.id === item.organizationId)!,
      );
    }
    if (include?.user) {
      membership.user = this.clone(
        this.store.users.find((candidate) => candidate.id === item.userId)!,
      );
    }
    if (include?.roles) {
      membership.roles = this.store.membershipRoles
        .filter((candidate) => candidate.membershipId === item.id)
        .map((candidate) => this.clone(candidate));
    }
    if (include?.branchScopes) {
      membership.branchScopes = this.store.membershipScopes
        .filter((candidate) => candidate.membershipId === item.id)
        .map((candidate) => this.clone(candidate));
    }
    return membership;
  }

  private pickOrganization(item: OrganizationRecord, select?: any) {
    if (!select) {
      return this.clone(item);
    }
    return this.pickObject(item, select);
  }

  private pickBranch(item: BranchRecord, select?: any) {
    if (!select) {
      return {
        ...this.clone(item),
        publicProfile: this.getBranchPublicProfile(item.id),
      };
    }
    const result = this.pickObject(item, select) as any;
    if (select.headCoachMembership) {
      const membership = item.headCoachMembershipId
        ? this.store.memberships.find(
            (candidate) => candidate.id === item.headCoachMembershipId,
          )
        : null;
      result.headCoachMembership = membership
        ? {
            id: membership.id,
            user: this.pickObject(
              this.store.users.find((candidate) => candidate.id === membership.userId)!,
              select.headCoachMembership.select.user.select,
            ),
          }
        : null;
    }
    if (select.publicProfile) {
      const publicProfile = this.getBranchPublicProfile(item.id);
      result.publicProfile = publicProfile
        ? this.pickObject(publicProfile, select.publicProfile.select ?? {})
        : null;
    }
    if (select.organization) {
      result.organization = this.pickObject(
        this.store.organizations.find((candidate) => candidate.id === item.organizationId)!,
        select.organization.select,
      );
    }
    return result;
  }

  private pickMembership(item: MembershipRecord, select?: any) {
    if (!select) {
      return this.clone(item);
    }
    const result = this.pickObject(item, select) as any;
    if (select.roles) {
      result.roles = this.store.membershipRoles
        .filter((candidate) => candidate.membershipId === item.id)
        .map((candidate) => this.pickObject(candidate, select.roles.select));
    }
    if (select.branchScopes) {
      result.branchScopes = this.store.membershipScopes
        .filter((candidate) => candidate.membershipId === item.id)
        .map((candidate) => this.pickObject(candidate, select.branchScopes.select));
    }
    if (select.user) {
      result.user = this.pickObject(
        this.store.users.find((candidate) => candidate.id === item.userId)!,
        select.user.select,
      );
    }
    if (select.organization) {
      result.organization = this.pickObject(
        this.store.organizations.find((candidate) => candidate.id === item.organizationId)!,
        select.organization.select,
      );
    }
    return result;
  }

  private pickStudent(item: StudentRecord, select?: any) {
    if (!select) {
      return this.clone(item);
    }
    const result = this.pickObject(item, select) as any;
    if (select.primaryBranch) {
      result.primaryBranch = this.pickObject(
        this.store.branches.find((candidate) => candidate.id === item.primaryBranchId)!,
        select.primaryBranch.select,
      );
    }
    return result;
  }

  private pickObject(source: Record<string, any>, select: Record<string, any>) {
    const result: Record<string, any> = {};
    for (const key of Object.keys(select)) {
      if (typeof select[key] === 'boolean' && select[key]) {
        result[key] = source[key];
      }
    }
    return result;
  }

  private createBranchPublicProfile(data: any) {
    const profile: BranchPublicProfileRecord = {
      id: this.nextId('bpp'),
      organizationId: data.organizationId,
      branchId: data.branchId,
      displayName: data.displayName ?? null,
      shortBio: data.shortBio ?? null,
      publicEmail: data.publicEmail ?? null,
      publicPhone: data.publicPhone ?? null,
      whatsapp: data.whatsapp ?? null,
      instagram: data.instagram ?? null,
      facebook: data.facebook ?? null,
      youtube: data.youtube ?? null,
      tiktok: data.tiktok ?? null,
      website: data.website ?? null,
      isPublished: data.isPublished ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.branchPublicProfiles.push(profile);
  }

  private getBranchPublicProfile(branchId: string) {
    const profile = this.store.branchPublicProfiles.find(
      (candidate) => candidate.branchId === branchId,
    );
    return profile ? this.clone(profile) : null;
  }

  private ensureStudentUserUnique(
    organizationId: string,
    userId: string | null,
    currentStudentId: string,
  ) {
    if (!userId) {
      return;
    }
    const existing = this.store.students.find(
      (student) =>
        student.organizationId === organizationId &&
        student.userId === userId &&
        student.id !== currentStudentId,
    );
    if (existing) {
      const error = new Error('Unique constraint failed');
      (error as any).code = 'P2002';
      throw error;
    }
  }

  private nextId(prefix: string) {
    this.sequence += 1;
    return `${prefix}_${this.sequence}`;
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
