import { Module } from '@nestjs/common';
import { ApartmentsController } from './apartments.controller.js';
import { ApartmentsService } from './apartments.service.js';

@Module({
  controllers: [ApartmentsController],
  providers: [ApartmentsService],
  exports: [ApartmentsService],
})
export class ApartmentsModule {}
