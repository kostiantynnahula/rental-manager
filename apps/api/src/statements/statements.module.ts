import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { ApartmentStatementsController } from './apartment-statements.controller.js';
import { StatementsController } from './statements.controller.js';
import { StatementsService } from './statements.service.js';

@Module({
  imports: [ApartmentsModule],
  controllers: [ApartmentStatementsController, StatementsController],
  providers: [StatementsService],
})
export class StatementsModule {}
