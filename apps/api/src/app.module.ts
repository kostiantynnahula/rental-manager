import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApartmentsModule } from './apartments/apartments.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.validation.js';
import { LeasesModule } from './leases/leases.module.js';
import { MetersModule } from './meters/meters.module.js';
import { PhotosModule } from './photos/photos.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReadingsModule } from './readings/readings.module.js';
import { StatementsModule } from './statements/statements.module.js';
import { TariffsModule } from './tariffs/tariffs.module.js';
import { TenantsModule } from './tenants/tenants.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // cwd is apps/api: an optional local .env wins over the shared root .env.
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ApartmentsModule,
    TenantsModule,
    LeasesModule,
    MetersModule,
    PhotosModule,
    ReadingsModule,
    TariffsModule,
    StatementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
