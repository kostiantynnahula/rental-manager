import type { TariffWithPrices } from '../helpers/tariff-with-prices.js';

export interface TariffPage {
  items: TariffWithPrices[];
  total: number;
  page: number;
  pageSize: number;
}
