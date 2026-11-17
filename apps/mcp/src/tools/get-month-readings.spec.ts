import { json, status } from '@rental/testing';
import { APARTMENT_ID, captureStderr, connect, METER_ID } from '../test/mcp-client.js';

const URL = `GET /apartments/${APARTMENT_ID}/readings?period=2026-11`;
const meter = {
  id: METER_ID,
  utility: 'ELECTRICITY',
  zoneScheme: 'DAY_NIGHT',
  label: null,
  serialNumber: 'E-1',
};
const reading = {
  id: 'r-1',
  meterId: METER_ID,
  kind: 'REGULAR',
  status: 'DRAFT',
  period: '2026-11',
  readingDate: '2026-11-28',
  note: 'private note',
  values: [
    { zone: 'DAY', value: '100.000', source: 'PHOTO', photoId: 'photo-1' },
    { zone: 'NIGHT', value: '50.000', source: 'MANUAL', photoId: null },
  ],
  consumption: null,
  createdById: 'user-1',
  confirmedAt: null,
  confirmedById: null,
  createdAt: 'x',
  updatedAt: 'x',
};

describe('get_month_readings', () => {
  it('lists every meter of the month, MISSING ones included', async () => {
    const gas = { ...meter, id: 'm-gas', utility: 'GAS', zoneScheme: 'SINGLE' };
    const { call } = await connect({
      [URL]: json([
        { meter, status: 'DRAFT', reading },
        { meter: gas, status: 'MISSING', reading: null },
      ]),
    });
    const result = await call('get_month_readings', {
      apartmentId: APARTMENT_ID,
      period: '2026-11',
    });

    expect(result.structuredContent).toEqual({
      period: '2026-11',
      meters: [
        {
          meter: {
            id: METER_ID,
            utility: 'ELECTRICITY',
            zoneScheme: 'DAY_NIGHT',
            label: null,
            serialNumber: 'E-1',
          },
          status: 'DRAFT',
          reading: {
            kind: 'REGULAR',
            status: 'DRAFT',
            readingDate: '2026-11-28',
            values: [
              { zone: 'DAY', value: '100.000', source: 'PHOTO' },
              { zone: 'NIGHT', value: '50.000', source: 'MANUAL' },
            ],
            consumption: null,
          },
        },
        {
          meter: {
            id: 'm-gas',
            utility: 'GAS',
            zoneScheme: 'SINGLE',
            label: null,
            serialNumber: 'E-1',
          },
          status: 'MISSING',
          reading: null,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/private note|photo-1|user-1/);
  });

  it('rejects a period that is not YYYY-MM without calling the API', async () => {
    const { call, requests } = await connect({});
    const result = await call('get_month_readings', {
      apartmentId: APARTMENT_ID,
      period: '11.2026',
    });
    expect(result.isError).toBe(true);
    expect(requests).toEqual([]);
  });

  it('passes a 400 message on', async () => {
    captureStderr();
    const { call } = await connect({ [URL]: status(400, { message: ['period must be YYYY-MM'] }) });
    const result = await call('get_month_readings', {
      apartmentId: APARTMENT_ID,
      period: '2026-11',
    });
    expect(result).toMatchObject({
      isError: true,
      content: [{ text: 'get_month_readings failed: API responded 400: period must be YYYY-MM' }],
    });
  });
});
