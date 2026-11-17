import { METER_ID, TARIFF_ID } from './mcp-client.js';

// API lines and warnings shared by the get_statement and preview_statement specs, with the fields that must not leak.
export const apiLines = [
  { type: 'RENT', name: 'Оренда', amount: 1500000 },
  {
    type: 'METERED',
    tariffId: TARIFF_ID,
    name: 'Електроенергія',
    zone: 'DAY',
    utilities: ['ELECTRICITY'],
    quantity: '200.000',
    unitPrice: '4.3200',
    amount: 86400,
    meters: [
      {
        meterId: METER_ID,
        utility: 'ELECTRICITY',
        label: null,
        serialNumber: 'E-1',
        consumption: '200.000',
        photoIds: ['photo-1'],
      },
    ],
  },
];

export const expectedLines = [
  {
    type: 'RENT',
    name: 'Оренда',
    zone: null,
    utilities: [],
    quantity: null,
    unitPrice: null,
    amount: '15000.00',
    meters: [],
  },
  {
    type: 'METERED',
    name: 'Електроенергія',
    zone: 'DAY',
    utilities: ['ELECTRICITY'],
    quantity: '200.000',
    unitPrice: '4.3200',
    amount: '864.00',
    meters: [{ utility: 'ELECTRICITY', label: null, serialNumber: 'E-1', consumption: '200.000' }],
  },
];

export const apiWarning = {
  code: 'MISSING_READING',
  meterId: METER_ID,
  utility: 'GAS',
  label: 'kitchen',
};
export const expectedWarning = {
  code: 'MISSING_READING',
  utility: 'GAS',
  label: 'kitchen',
  tariffName: null,
  zone: null,
  consumption: null,
  limit: null,
  months: null,
  reason: null,
};
