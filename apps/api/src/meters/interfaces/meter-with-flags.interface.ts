import type { MeterWithLastReading } from '../../readings/helpers/last-confirmed-reading.js';
import type { MeterFlags } from '../helpers/meter-flags.js';

export interface MeterWithFlags extends MeterWithLastReading, MeterFlags {}
