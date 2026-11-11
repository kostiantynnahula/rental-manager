import { Prisma } from '../../generated/prisma/client.js';
import { TariffKind, UtilityType, Zone } from '../../generated/prisma/enums.js';
import type { StatementAttachment } from '../interfaces/statement-attachment.interface.js';
import type { StatementInput } from '../interfaces/statement-input.interface.js';
import type { StatementMeter } from '../interfaces/statement-meter.interface.js';
import { calculateStatement } from './statement-calculator.js';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dec = (value: string) => new Prisma.Decimal(value);
const PERIOD = date('2026-10-01');

function tariff(
  name: string,
  kind: TariffKind,
  utilities: UtilityType[],
  prices: [string, Zone, string][],
  dates: { activeFrom?: string; activeTo?: string } = {},
): StatementAttachment {
  return {
    activeFrom: date(dates.activeFrom ?? '2026-01-01'),
    activeTo: dates.activeTo ? date(dates.activeTo) : null,
    tariff: {
      id: `tariff-${name}`,
      name,
      kind,
      utilities,
      prices: prices.map(([effectiveFrom, zone, price]) => ({
        effectiveFrom: date(effectiveFrom),
        zone,
        price: dec(price),
      })),
    },
  };
}

function meter(
  id: string,
  utility: UtilityType,
  over: Partial<StatementMeter> = {},
): StatementMeter {
  return {
    id,
    utility,
    label: null,
    serialNumber: null,
    installedAt: date('2025-01-01'),
    removedAt: null,
    ...over,
  };
}

function row(
  meterId: string,
  zone: Zone,
  consumption: string | null,
  previousPeriod = '2026-09-01',
) {
  return {
    meterId,
    zone,
    consumption: consumption === null ? null : dec(consumption),
    previousPeriod: consumption === null ? null : date(previousPeriod),
    photoId: null,
  };
}

function input(over: Partial<StatementInput>): StatementInput {
  return { period: PERIOD, attachments: [], meters: [], leases: [], consumption: [], ...over };
}

const electricity = (prices: [string, Zone, string][]) =>
  tariff('Світло', TariffKind.METERED, [UtilityType.ELECTRICITY], prices);

describe('calculateStatement', () => {
  it('bills a fixed fee as one full month', () => {
    const result = calculateStatement(
      input({
        attachments: [tariff('Ліфт', TariffKind.FIXED, [], [['2026-01-01', Zone.TOTAL, '120.50']])],
      }),
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ type: 'FIXED', name: 'Ліфт', amount: 12050 });
    expect(result.lines[0].quantity?.toFixed(3)).toBe('1.000');
    expect(result.total).toBe(12050);
    expect(result.warnings).toEqual([]);
  });

  it('uses the price valid for the period', () => {
    const result = calculateStatement(
      input({
        attachments: [
          tariff(
            'Ліфт',
            TariffKind.FIXED,
            [],
            [
              ['2026-01-01', Zone.TOTAL, '100'],
              ['2026-10-01', Zone.TOTAL, '110'],
              ['2026-11-01', Zone.TOTAL, '120'],
            ],
          ),
        ],
      }),
    );
    expect(result.total).toBe(11000);
  });

  it('bills a single-zone meter', () => {
    const result = calculateStatement(
      input({
        attachments: [electricity([['2026-01-01', Zone.TOTAL, '4.32']])],
        meters: [meter('m1', UtilityType.ELECTRICITY)],
        consumption: [row('m1', Zone.TOTAL, '100.000')],
      }),
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ type: 'METERED', zone: Zone.TOTAL, amount: 43200 });
    expect(result.lines[0].meters?.map((m) => m.meterId)).toEqual(['m1']);
    expect(result.warnings).toEqual([]);
  });

  it('prices DAY by the TOTAL fallback and NIGHT by its own price', () => {
    const result = calculateStatement(
      input({
        attachments: [
          electricity([
            ['2026-01-01', Zone.TOTAL, '4.32'],
            ['2026-01-01', Zone.NIGHT, '2.16'],
          ]),
        ],
        meters: [meter('m1', UtilityType.ELECTRICITY)],
        consumption: [row('m1', Zone.NIGHT, '50'), row('m1', Zone.DAY, '150')],
      }),
    );
    expect(result.lines.map((l) => [l.zone, l.amount])).toEqual([
      [Zone.DAY, 64800],
      [Zone.NIGHT, 10800],
    ]);
    expect(result.total).toBe(75600);
  });

  it('sums a drainage tariff over two utilities', () => {
    const result = calculateStatement(
      input({
        attachments: [
          tariff(
            'Водовідведення',
            TariffKind.METERED,
            [UtilityType.COLD_WATER, UtilityType.HOT_WATER],
            [['2026-01-01', Zone.TOTAL, '10.50']],
          ),
        ],
        meters: [meter('cold', UtilityType.COLD_WATER), meter('hot', UtilityType.HOT_WATER)],
        consumption: [row('cold', Zone.TOTAL, '3'), row('hot', Zone.TOTAL, '2')],
      }),
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].quantity?.toFixed(3)).toBe('5.000');
    expect(result.lines[0].amount).toBe(5250);
    expect(result.lines[0].meters?.map((m) => m.consumption.toFixed(3))).toEqual([
      '3.000',
      '2.000',
    ]);
  });

  it('adds up a meter replaced in the period: FINAL of the old + REGULAR of the new', () => {
    const result = calculateStatement(
      input({
        attachments: [electricity([['2026-01-01', Zone.TOTAL, '2']])],
        meters: [
          meter('old', UtilityType.ELECTRICITY, { removedAt: date('2026-10-15') }),
          meter('new', UtilityType.ELECTRICITY, { installedAt: date('2026-10-15') }),
        ],
        consumption: [
          row('old', Zone.TOTAL, '10'),
          row('new', Zone.TOTAL, null),
          row('new', Zone.TOTAL, '5'),
        ],
      }),
    );
    expect(result.lines[0].quantity?.toFixed(3)).toBe('15.000');
    expect(result.total).toBe(3000);
    expect(result.warnings).toEqual([]);
  });

  it("doesn't warn about a meter installed in the period with only its INITIAL reading", () => {
    const result = calculateStatement(
      input({
        attachments: [electricity([['2026-01-01', Zone.TOTAL, '4.32']])],
        meters: [meter('new', UtilityType.ELECTRICITY, { installedAt: date('2026-10-20') })],
        consumption: [row('new', Zone.TOTAL, null)],
      }),
    );
    expect(result.lines).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('warns once about a missing reading, even when two tariffs bill the meter', () => {
    const result = calculateStatement(
      input({
        attachments: [
          tariff(
            'Вода',
            TariffKind.METERED,
            [UtilityType.COLD_WATER],
            [['2026-01-01', Zone.TOTAL, '30']],
          ),
          tariff(
            'Водовідведення',
            TariffKind.METERED,
            [UtilityType.COLD_WATER],
            [['2026-01-01', Zone.TOTAL, '10']],
          ),
        ],
        meters: [meter('cold', UtilityType.COLD_WATER, { label: 'кухня' })],
      }),
    );
    expect(result.lines).toEqual([]);
    expect(result.warnings).toEqual([
      {
        code: 'MISSING_READING',
        meterId: 'cold',
        utility: UtilityType.COLD_WATER,
        label: 'кухня',
      },
    ]);
  });

  it('skips a line without a price and warns', () => {
    const fixed = tariff('Ліфт', TariffKind.FIXED, [], [['2026-11-01', Zone.TOTAL, '100']]);
    const metered = electricity([['2026-11-01', Zone.TOTAL, '4.32']]);
    const result = calculateStatement(
      input({
        attachments: [fixed, metered],
        meters: [meter('m1', UtilityType.ELECTRICITY)],
        consumption: [row('m1', Zone.TOTAL, '100')],
      }),
    );
    expect(result.lines).toEqual([]);
    expect(result.warnings).toEqual([
      { code: 'NO_PRICE', tariffId: metered.tariff.id, tariffName: 'Світло', zone: Zone.TOTAL },
      { code: 'NO_PRICE', tariffId: fixed.tariff.id, tariffName: 'Ліфт', zone: Zone.TOTAL },
    ]);
  });

  it('warns about a metered tariff without meters', () => {
    const metered = electricity([['2026-01-01', Zone.TOTAL, '4.32']]);
    const result = calculateStatement(input({ attachments: [metered] }));
    expect(result.lines).toEqual([]);
    expect(result.warnings).toEqual([
      { code: 'NO_METERS', tariffId: metered.tariff.id, tariffName: 'Світло' },
    ]);
  });

  it('bills the rent of the one lease overlapping the period', () => {
    const result = calculateStatement(
      input({
        leases: [
          {
            id: 'lease-1',
            startDate: date('2026-01-01'),
            endDate: date('2026-09-30'),
            monthlyRent: 100000,
          },
          { id: 'lease-2', startDate: date('2026-10-20'), endDate: null, monthlyRent: 150000 },
        ],
      }),
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ type: 'RENT', amount: 150000 });
    expect(result.lines[0].unitPrice?.toFixed(4)).toBe('1500.0000');
    expect(result.warnings).toEqual([]);
  });

  it('has no rent line without a lease in the period', () => {
    const result = calculateStatement(
      input({
        leases: [
          { id: 'lease-3', startDate: date('2026-11-01'), endDate: null, monthlyRent: 150000 },
        ],
      }),
    );
    expect(result).toEqual({ lines: [], total: 0, warnings: [] });
  });

  it('warns about several leases in the period and bills no rent', () => {
    const result = calculateStatement(
      input({
        leases: [
          {
            id: 'lease-4',
            startDate: date('2026-01-01'),
            endDate: date('2026-10-15'),
            monthlyRent: 100000,
          },
          { id: 'lease-5', startDate: date('2026-10-16'), endDate: null, monthlyRent: 150000 },
        ],
      }),
    );
    expect(result.lines).toEqual([]);
    expect(result.warnings).toEqual([{ code: 'MULTIPLE_LEASES' }]);
  });

  it('rounds half up to kopiyky', () => {
    const result = calculateStatement(
      input({
        attachments: [electricity([['2026-01-01', Zone.TOTAL, '1.0000']])],
        meters: [meter('m1', UtilityType.ELECTRICITY)],
        consumption: [row('m1', Zone.TOTAL, '12.345')],
      }),
    );
    expect(result.total).toBe(1235);
  });

  it('ignores attachments and meters not active in the period', () => {
    const ended = tariff('Домофон', TariffKind.FIXED, [], [['2026-01-01', Zone.TOTAL, '50']], {
      activeTo: '2026-09-01',
    });
    const planned = tariff('Ліфт', TariffKind.FIXED, [], [['2026-01-01', Zone.TOTAL, '50']], {
      activeFrom: '2026-11-01',
    });
    const result = calculateStatement(
      input({
        attachments: [ended, planned, electricity([['2026-01-01', Zone.TOTAL, '2']])],
        meters: [
          meter('removed', UtilityType.ELECTRICITY, { removedAt: date('2026-09-30') }),
          meter('future', UtilityType.ELECTRICITY, { installedAt: date('2026-11-01') }),
          meter('active', UtilityType.ELECTRICITY),
        ],
        consumption: [row('active', Zone.TOTAL, '1')],
      }),
    );
    expect(result.lines.map((l) => l.meters?.map((m) => m.meterId))).toEqual([['active']]);
    expect(result.warnings).toEqual([]);
  });

  it('orders lines: rent, metered by utility and zone, fixed by name', () => {
    const result = calculateStatement(
      input({
        attachments: [
          tariff('Ліфт', TariffKind.FIXED, [], [['2026-01-01', Zone.TOTAL, '1']]),
          tariff('Вивіз сміття', TariffKind.FIXED, [], [['2026-01-01', Zone.TOTAL, '1']]),
          tariff('Газ', TariffKind.METERED, [UtilityType.GAS], [['2026-01-01', Zone.TOTAL, '1']]),
          tariff(
            'Вода',
            TariffKind.METERED,
            [UtilityType.COLD_WATER],
            [['2026-01-01', Zone.TOTAL, '1']],
          ),
          electricity([['2026-01-01', Zone.TOTAL, '1']]),
        ],
        meters: [
          meter('gas', UtilityType.GAS),
          meter('cold', UtilityType.COLD_WATER),
          meter('el', UtilityType.ELECTRICITY),
        ],
        leases: [{ id: 'lease-6', startDate: date('2026-01-01'), endDate: null, monthlyRent: 100 }],
        consumption: [
          row('gas', Zone.TOTAL, '1'),
          row('cold', Zone.TOTAL, '1'),
          row('el', Zone.TOTAL, '1'),
          row('el', Zone.NIGHT, '1'),
          row('el', Zone.DAY, '1'),
        ],
      }),
    );
    expect(result.lines.map((l) => [l.name, l.zone])).toEqual([
      ['Оренда', undefined],
      ['Світло', Zone.DAY],
      ['Світло', Zone.NIGHT],
      ['Світло', Zone.TOTAL],
      ['Вода', Zone.TOTAL],
      ['Газ', Zone.TOTAL],
      ['Вивіз сміття', undefined],
      ['Ліфт', undefined],
    ]);
  });

  describe('unusual consumption', () => {
    const lease = { id: 'lease-7', startDate: date('2026-01-01'), endDate: null, monthlyRent: 100 };
    const unusual = (warnings: { code: string }[]) =>
      warnings.filter((w) => w.code === 'UNUSUAL_CONSUMPTION');

    it('warns about a zone above its monthly limit', () => {
      const result = calculateStatement(
        input({
          attachments: [electricity([['2026-01-01', Zone.TOTAL, '4.32']])],
          meters: [meter('m1', UtilityType.ELECTRICITY, { label: 'кухня' })],
          consumption: [row('m1', Zone.DAY, '130.500'), row('m1', Zone.NIGHT, '70')],
        }),
      );
      expect(result.warnings).toEqual([
        {
          code: 'UNUSUAL_CONSUMPTION',
          meterId: 'm1',
          utility: UtilityType.ELECTRICITY,
          label: 'кухня',
          zone: Zone.DAY,
          consumption: '130.5',
          limit: 130,
          months: 1,
          reason: 'ABOVE_LIMIT',
        },
      ]);
    });

    it('scales the limit by the months since the previous reading', () => {
      const run = (consumption: string) =>
        calculateStatement(
          input({
            attachments: [electricity([['2026-01-01', Zone.TOTAL, '1']])],
            meters: [meter('m1', UtilityType.ELECTRICITY)],
            consumption: [row('m1', Zone.DAY, consumption, '2026-07-01')],
          }),
        ).warnings;
      expect(run('390')).toEqual([]);
      expect(unusual(run('391'))).toMatchObject([{ months: 3, consumption: '391' }]);
    });

    it('counts INITIAL + REGULAR in one month as one month', () => {
      const result = calculateStatement(
        input({
          attachments: [electricity([['2026-01-01', Zone.TOTAL, '1']])],
          meters: [meter('new', UtilityType.ELECTRICITY, { installedAt: date('2026-10-01') })],
          consumption: [row('new', Zone.TOTAL, null), row('new', Zone.TOTAL, '250', '2026-10-01')],
        }),
      );
      expect(unusual(result.warnings)).toMatchObject([{ months: 1, limit: 200 }]);
    });

    it('flags zero electricity only while a lease covers the period', () => {
      const run = (leases: (typeof lease)[]) =>
        calculateStatement(
          input({
            attachments: [electricity([['2026-01-01', Zone.TOTAL, '1']])],
            meters: [meter('m1', UtilityType.ELECTRICITY)],
            leases,
            consumption: [row('m1', Zone.TOTAL, '0.000')],
          }),
        ).warnings;
      expect(unusual(run([lease]))).toMatchObject([
        { zone: Zone.TOTAL, consumption: '0', reason: 'ZERO_CONSUMPTION' },
      ]);
      expect(run([])).toEqual([]);
    });

    it("doesn't flag zero water, even with a lease", () => {
      const result = calculateStatement(
        input({
          attachments: [
            tariff(
              'Вода',
              TariffKind.METERED,
              [UtilityType.COLD_WATER],
              [['2026-01-01', Zone.TOTAL, '1']],
            ),
          ],
          meters: [meter('cold', UtilityType.COLD_WATER)],
          leases: [lease],
          consumption: [row('cold', Zone.TOTAL, '0')],
        }),
      );
      expect(unusual(result.warnings)).toEqual([]);
    });

    it('warns once about a meter billed by two tariffs', () => {
      const result = calculateStatement(
        input({
          attachments: [
            tariff(
              'Вода',
              TariffKind.METERED,
              [UtilityType.COLD_WATER],
              [['2026-01-01', Zone.TOTAL, '30']],
            ),
            tariff(
              'Водовідведення',
              TariffKind.METERED,
              [UtilityType.COLD_WATER],
              [['2026-01-01', Zone.TOTAL, '10']],
            ),
          ],
          meters: [meter('cold', UtilityType.COLD_WATER)],
          consumption: [row('cold', Zone.TOTAL, '25')],
        }),
      );
      expect(unusual(result.warnings)).toMatchObject([{ meterId: 'cold', limit: 20 }]);
    });
  });
});
