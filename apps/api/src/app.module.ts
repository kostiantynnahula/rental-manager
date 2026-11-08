import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApartmentsModule } from './apartments/apartments.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { configModuleOptions } from './config/config-module-options.js';
import { HealthController } from './health/health.controller.js';
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
    ConfigModule.forRoot(configModuleOptions),
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
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
