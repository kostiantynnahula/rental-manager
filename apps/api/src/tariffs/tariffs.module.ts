import { Module } from '@nestjs/common';
import { TariffsController } from './tariffs.controller.js';
import { TariffsService } from './tariffs.service.js';

@Module({
  controllers: [TariffsController],
  providers: [TariffsService],
  exports: [TariffsService],
})
export class TariffsModule {}
