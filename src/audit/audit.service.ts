import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: Prisma.AuditLogUncheckedCreateInput) {
    return this.prisma.auditLog.create({
      data: entry,
    });
  }
}
