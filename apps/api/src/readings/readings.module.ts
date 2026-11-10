import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { MetersModule } from '../meters/meters.module.js';
import { PhotosModule } from '../photos/photos.module.js';
import { ApartmentReadingsController } from './apartment-readings.controller.js';
import { DraftValuesService } from './draft-values.service.js';
import { MeterDraftValuesController } from './meter-draft-values.controller.js';
import { MeterReadingsController } from './meter-readings.controller.js';
import { ReadingsController } from './readings.controller.js';
import { ReadingsService } from './readings.service.js';

@Module({
  imports: [MetersModule, ApartmentsModule, PhotosModule],
  controllers: [
    MeterReadingsController,
    MeterDraftValuesController,
    ApartmentReadingsController,
    ReadingsController,
  ],
  providers: [ReadingsService, DraftValuesService],
})
export class ReadingsModule {}
