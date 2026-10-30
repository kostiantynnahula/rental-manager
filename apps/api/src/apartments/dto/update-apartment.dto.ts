import { PartialType } from '@nestjs/swagger';
import { CreateApartmentDto } from './create-apartment.dto.js';

// No isActive here: archiving goes through POST /apartments/:id/archive|unarchive.
export class UpdateApartmentDto extends PartialType(CreateApartmentDto) {}
