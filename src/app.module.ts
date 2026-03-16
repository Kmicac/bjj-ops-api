import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { BranchesModule } from './branches/branches.module';
import { PublicBranchesModule } from './public-branches/public-branches.module';
import { RolesPermissionsModule } from './roles-permissions/roles-permissions.module';
import { StudentsModule } from './students/students.module';
import { InstructorsModule } from './instructors/instructors.module';
import { ClassesModule } from './classes/classes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PromotionsModule } from './promotions/promotions.module';
import { MembershipsModule } from './memberships/memberships.module';
import { BillingModule } from './billing/billing.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { ShopModule } from './shop/shop.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [CommonModule, ConfigModule, PrismaModule, AuthModule, UsersModule, OrganizationsModule, BranchesModule, PublicBranchesModule, RolesPermissionsModule, StudentsModule, InstructorsModule, ClassesModule, AttendanceModule, PromotionsModule, MembershipsModule, BillingModule, CompetitionsModule, ShopModule, AnalyticsModule, NotificationsModule, AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
