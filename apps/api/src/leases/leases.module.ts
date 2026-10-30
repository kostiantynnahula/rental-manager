import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { ApartmentLeasesController } from './apartment-leases.controller.js';
import { LeasesController } from './leases.controller.js';
import { LeasesService } from './leases.service.js';

@Module({
  imports: [ApartmentsModule, TenantsModule],
  controllers: [ApartmentLeasesController, LeasesController],
  providers: [LeasesService],
})
export class LeasesModule {}
