import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { ApartmentMetersController } from './apartment-meters.controller.js';
import { MetersController } from './meters.controller.js';
import { MetersService } from './meters.service.js';

@Module({
  imports: [ApartmentsModule],
  controllers: [ApartmentMetersController, MetersController],
  providers: [MetersService],
  exports: [MetersService],
})
export class MetersModule {}
