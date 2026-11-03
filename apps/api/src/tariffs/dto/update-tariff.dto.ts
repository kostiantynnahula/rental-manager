import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTariffDto } from './create-tariff.dto.js';

// Prices have their own endpoints; archiving goes through POST /tariffs/:id/archive|unarchive.
// kind/utilities can change only while the tariff isn't attached to any apartment.
export class UpdateTariffDto extends PartialType(OmitType(CreateTariffDto, ['prices'] as const)) {}
