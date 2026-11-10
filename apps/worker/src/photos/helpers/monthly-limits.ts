import type { components } from '../../api/schema.js';

// Consumption per month (per zone for DAY_NIGHT) above which a parsed value gets a warning in the draft's note.
// Rough upper bounds for one apartment — tune by hand; they never block a draft.
export const MONTHLY_LIMITS: Record<components['schemas']['UtilityType'], number> = {
  ELECTRICITY: 1000, // kWh
  COLD_WATER: 30, // m³
  HOT_WATER: 20, // m³
  GAS: 300, // m³
};
