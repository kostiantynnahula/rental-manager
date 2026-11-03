import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { ApartmentTariffsController } from './apartment-tariffs.controller.js';
import { ApartmentTariffsService } from './apartment-tariffs.service.js';
import { TariffsController } from './tariffs.controller.js';
import { TariffsService } from './tariffs.service.js';

@Module({
  imports: [ApartmentsModule],
  controllers: [TariffsController, ApartmentTariffsController],
  providers: [TariffsService, ApartmentTariffsService],
  exports: [TariffsService, ApartmentTariffsService],
})
export class TariffsModule {}
