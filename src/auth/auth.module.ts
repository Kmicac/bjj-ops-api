import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccessControlService } from './access-control.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
          issuer: configService.getOrThrow<string>('APP_NAME'),
          audience: configService.getOrThrow<string>('APP_NAME'),
        },
      }),
    }),
    AuditModule,
  ],
  providers: [AuthService, JwtStrategy, AccessControlService],
  controllers: [AuthController],
  exports: [AuthService, AccessControlService, PassportModule],
})
export class AuthModule {}
