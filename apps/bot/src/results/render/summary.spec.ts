import { RESULT_TEXTS } from '../../messages.js';
import {
  apartment,
  BATCH_ID,
  batch,
  batchApartment,
  batchMeter,
  batchPhoto,
  PHOTO_ID,
  reading,
  READING_ID,
  uuid,
  value,
  warning,
} from '../../test/builders.js';
import type { RenderedSummary } from '../interfaces/rendered-summary.interface.js';
import { parseCallbackData } from './callback-data.js';
import { renderSummary } from './summary.js';

type Batch = Parameters<typeof renderSummary>[0];
type Apartments = Parameters<typeof renderSummary>[1];

// Renders and checks what holds for every summary: each button's callback_data parses back and fits 64 bytes.
function render(b: Batch, apartments: Apartments = []): RenderedSummary & { lines: string[] } {
  const summary = renderSummary(b, apartments);
  for (const button of summary.buttons.flat()) {
    expect(parseCallbackData(button.data), button.text).not.toBeNull();
    expect(Buffer.byteLength(button.data)).toBeLessThanOrEqual(64);
  }
  return { ...summary, lines: summary.text.split('\n') };
}

// One DRAFT reading per id, all in one apartment.
function batchOf(...readings: ReturnType<typeof reading>[]): Batch {
  return batch({ apartments: [batchApartment({ readings })] });
}

const buttonTexts = (s: RenderedSummary) => s.buttons.map((row) => row.map((b) => b.text));
const actions = (s: RenderedSummary) => s.buttons.flat().map((b) => parseCallbackData(b.data));

describe('renderSummary', () => {
  describe('a DRAFT reading', () => {
    it('shows the meter, the value with its consumption, and Confirm + Cancel', () => {
      const summary = render(batch());
      expect(summary.lines).toEqual([
        'Результат розпізнавання:',
        '',
        '🏠 Shevchenka 12/5',
        '⚡ Електроенергія, 2026-10',
        '  Показник: 1520,350 (було 1400,350; +120,000 кВт·год)',
      ]);
      expect(buttonTexts(summary)).toEqual([
        ['Підтвердити: ⚡ Електроенергія', 'Скасувати: ⚡ Електроенергія'],
      ]);
      expect(actions(summary)).toEqual([
        { kind: 'confirm', batchId: BATCH_ID, readingId: READING_ID },
        { kind: 'cancel', batchId: BATCH_ID, readingId: READING_ID },
      ]);
    });

    it('shows the label and the serial number; buttons use the label', () => {
      const meter = batchMeter({ utility: 'COLD_WATER', label: 'кухня', serialNumber: 'A-17' });
      const summary = render(batchOf(reading({ meter })));
      expect(summary.lines).toContain('💧 Холодна вода (кухня) №A-17, 2026-10');
      expect(summary.lines).toContain('  Показник: 1520,350 (було 1400,350; +120,000 м³)');
      expect(buttonTexts(summary)).toEqual([['Підтвердити: 💧 кухня', 'Скасувати: 💧 кухня']]);
    });

    it('has only Cancel when it cannot be confirmed', () => {
      const summary = render(batchOf(reading({ canConfirm: false })));
      expect(buttonTexts(summary)).toEqual([['Скасувати: ⚡ Електроенергія']]);
    });

    it('shows that there is no previous value', () => {
      const summary = render(
        batchOf(reading({ values: [value({ previousValue: null, consumption: null })] })),
      );
      expect(summary.lines).toContain('  Показник: 1520,350 (попереднього показання немає)');
    });

    it('lists the missing zones', () => {
      const summary = render(
        batchOf(
          reading({
            meter: batchMeter({ zoneScheme: 'DAY_NIGHT' }),
            values: [value({ zone: 'DAY' })],
            missingZones: ['NIGHT'],
            canConfirm: false,
          }),
        ),
      );
      expect(summary.lines.slice(-2)).toEqual([
        '  День: 1520,350 (було 1400,350; +120,000 кВт·год)',
        '  Ніч: бракує — надішліть фото цієї зони',
      ]);
    });

    it('shows a multi-line note line by line', () => {
      const summary = render(batchOf(reading({ note: 'blurry\nre-check' })));
      expect(summary.lines.slice(-2)).toEqual(['  📝 blurry', '  📝 re-check']);
    });
  });

  describe('warnings on a DRAFT', () => {
    it('words zero consumption', () => {
      const v = value({
        consumption: '0.000',
        warnings: [warning({ code: 'ZERO_CONSUMPTION', limit: null })],
      });
      const summary = render(batchOf(reading({ values: [v] })));
      expect(summary.lines).toContain('  ⚠️ Нульове споживання, хоча є договір');
    });

    it('words consumption above the limit, for one month and for several', () => {
      const v = value({
        consumption: '350.500',
        warnings: [warning({ limit: 200, months: 1 }), warning({ limit: 200, months: 3 })],
      });
      const summary = render(batchOf(reading({ values: [v] })));
      expect(summary.lines.slice(-2)).toEqual([
        '  ⚠️ Спожито 350,500 кВт·год — більше за звичні 200/міс.',
        '  ⚠️ Спожито 350,500 кВт·год за 3 міс. — більше за звичні 200/міс.',
      ]);
    });

    it('shows only «lower than the previous» for a lower value, with no plus sign', () => {
      const v = value({
        value: '1300.000',
        consumption: '-100.350',
        lowerThanPrevious: true,
        warnings: [warning()],
      });
      const summary = render(batchOf(reading({ values: [v], canConfirm: false })));
      expect(summary.lines.slice(-2)).toEqual([
        '  Показник: 1300,000 (було 1400,350; -100,350 кВт·год)',
        '  ⚠️ Менше за попереднє — підтвердити не вийде',
      ]);
    });
  });

  describe.each([
    ['CONFIRMED', ' — ✅ підтверджено'],
    ['CANCELLED', ' — ❌ скасовано'],
  ] as const)('a %s reading', (status, suffix) => {
    it('shows its status with no buttons and no hints', () => {
      const summary = render(
        batchOf(
          reading({
            status,
            canConfirm: false,
            note: 'a note',
            missingZones: ['NIGHT'],
            values: [value({ warnings: [warning()] })],
          }),
        ),
      );
      expect(summary.lines).toEqual([
        'Результат розпізнавання:',
        '',
        '🏠 Shevchenka 12/5',
        `⚡ Електроенергія, 2026-10${suffix}`,
        '  Показник: 1520,350 (було 1400,350; +120,000 кВт·год)',
        '',
        'Усе опрацьовано.',
      ]);
      expect(summary.buttons).toEqual([]);
    });
  });

  describe('«Confirm all»', () => {
    const second = { id: uuid(40), meter: batchMeter({ id: uuid(50), utility: 'GAS' }) };

    it('is there for two confirmable readings, after the reading buttons', () => {
      const summary = render(batchOf(reading(), reading(second)));
      expect(summary.buttons).toHaveLength(3);
      expect(buttonTexts(summary)[2]).toEqual(['Підтвердити всі']);
      expect(actions(summary)[4]).toEqual({ kind: 'confirm-batch', batchId: BATCH_ID });
    });

    it('is not there for one confirmable reading', () => {
      const summary = render(batchOf(reading()));
      expect(buttonTexts(summary).flat()).not.toContain('Підтвердити всі');
    });

    it('is not there when only one of two DRAFTs can be confirmed', () => {
      const summary = render(batchOf(reading(), reading({ ...second, canConfirm: false })));
      expect(buttonTexts(summary).flat()).not.toContain('Підтвердити всі');
    });

    it('does not count decided readings', () => {
      const summary = render(
        batchOf(reading(), reading({ ...second, status: 'CONFIRMED', canConfirm: false })),
      );
      expect(buttonTexts(summary).flat()).not.toContain('Підтвердити всі');
    });
  });

  it('marks an archived apartment', () => {
    const summary = render(batch({ apartments: [batchApartment({ isActive: false })] }));
    expect(summary.lines).toContain('🏠 Shevchenka 12/5 (в архіві)');
  });

  describe('photos without a reading', () => {
    const photo2 = uuid(20);

    it('offers one assign button per active apartment for a NOT_MATCHED photo', () => {
      const apartments = [
        apartment({ id: uuid(30), name: 'A' }),
        apartment({ id: uuid(31), name: 'B' }),
      ];
      const summary = render(
        batch({
          photos: [
            batchPhoto(),
            batchPhoto({ id: photo2, parseStatus: 'NOT_MATCHED', parseNote: 'serial 99' }),
          ],
        }),
        apartments,
      );
      expect(summary.lines.slice(-2)).toEqual([
        '',
        '📷 фото 2: лічильник не знайдено — serial 99. Оберіть квартиру:',
      ]);
      expect(buttonTexts(summary).slice(1)).toEqual([['фото 2 → A'], ['фото 2 → B']]);
      expect(actions(summary).slice(2)).toEqual([
        { kind: 'assign', photoId: photo2, apartmentId: uuid(30) },
        { kind: 'assign', photoId: photo2, apartmentId: uuid(31) },
      ]);
    });

    it('shows the note of a FAILED photo and a PENDING one as being parsed', () => {
      const summary = render(
        batch({
          photos: [
            batchPhoto(),
            batchPhoto({ id: photo2, parseStatus: 'FAILED', parseNote: 'model timeout' }),
            batchPhoto({ id: uuid(21), parseStatus: 'PENDING' }),
          ],
        }),
      );
      expect(summary.lines.slice(-3)).toEqual([
        '',
        '📷 фото 2: помилка розпізнавання — model timeout',
        '📷 фото 3: розпізнаю…',
      ]);
    });

    it('shows no line for a photo that has a reading, whatever its status', () => {
      const summary = render(
        batch({ photos: [batchPhoto({ parseStatus: 'FAILED', parseNote: 'x' })] }),
      );
      expect(summary.text).not.toContain('📷');
    });

    it('shows no line for a PARSED photo without a reading', () => {
      const summary = render(batch({ photos: [batchPhoto(), batchPhoto({ id: photo2 })] }));
      expect(summary.text).not.toContain('📷');
    });

    it('counts photo positions in upload order, before the photos with readings too', () => {
      const summary = render(
        batch({
          photos: [
            batchPhoto({ id: photo2, parseStatus: 'PENDING' }),
            batchPhoto({ id: PHOTO_ID }),
          ],
        }),
      );
      expect(summary.lines.at(-1)).toBe('📷 фото 1: розпізнаю…');
    });

    // bug: «all done» is shown whenever there are no buttons, so a FAILED photo is followed by «Усе опрацьовано.»
    // although nothing was read from it.
    it.fails('does not say «all done» after a FAILED photo', () => {
      const summary = render(
        batch({ photos: [batchPhoto({ parseStatus: 'FAILED', parseNote: null })], apartments: [] }),
      );
      expect(summary.lines).toContain('📷 фото 1: помилка розпізнавання');
      expect(summary.lines).not.toContain(RESULT_TEXTS.allDone);
    });

    // bug: a NOT_MATCHED photo with no active apartments says «Оберіть квартиру:» with nothing to pick, then
    // «Усе опрацьовано.» (no buttons → «all done»).
    it.fails(
      'does not say «all done» after a NOT_MATCHED photo when there is no apartment to pick',
      () => {
        const summary = render(
          batch({
            photos: [batchPhoto({ parseStatus: 'NOT_MATCHED', parseNote: null })],
            apartments: [],
          }),
          [],
        );
        expect(summary.lines).toContain('📷 фото 1: лічильник не знайдено. Оберіть квартиру:');
        expect(summary.lines).not.toContain(RESULT_TEXTS.allDone);
      },
    );
  });

  it('says nothing was found for a batch without readings or photo lines', () => {
    const summary = render(batch({ apartments: [] }));
    expect(summary.lines).toEqual(['Результат розпізнавання:', '', 'Показань не знайдено.']);
    expect(summary.buttons).toEqual([]);
  });

  describe('a text over Telegram’s 4096 limit', () => {
    it('is cut to 4096 with the truncation mark', () => {
      const summary = render(batchOf(reading({ note: 'x'.repeat(5000) })));
      expect(summary.text).toHaveLength(4096);
      expect(summary.text.endsWith(RESULT_TEXTS.truncated)).toBe(true);
      expect(summary.text.startsWith('Результат розпізнавання:')).toBe(true);
    });

    it('keeps the buttons', () => {
      expect(render(batchOf(reading({ note: 'x'.repeat(5000) }))).buttons).toHaveLength(1);
    });

    // bug: truncate() slices UTF-16 units, so the cut can split an emoji (every meter line starts with one) and
    // leave a lone surrogate — not valid UTF-8 for Telegram, the send fails on every retry.
    it.fails('never cuts an emoji in half', () => {
      const loneSurrogate =
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
      for (const pad of ['', 'x']) {
        const { text } = render(batchOf(reading({ note: pad + '🔥'.repeat(3000) })));
        expect(text).not.toMatch(loneSurrogate);
      }
    });
  });
});
