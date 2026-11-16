import {
  aboveLimitText,
  decimalText,
  intakeReply,
  MESSAGES,
  photoName,
  photoStatusText,
  TAP_TEXTS,
} from './messages.js';

describe('decimalText', () => {
  it('uses a decimal comma', () => {
    expect(decimalText('1520.350')).toBe('1520,350');
  });

  it('keeps an integer as is', () => {
    expect(decimalText('42')).toBe('42');
  });
});

describe('photoName', () => {
  it('names a photo by its position', () => {
    expect(photoName(3)).toBe('фото 3');
  });
});

describe('intakeReply', () => {
  it('reports accepted photos', () => {
    expect(intakeReply({ accepted: 2, duplicates: 0, rejected: [] })).toBe(
      'Прийнято 2 фото, розпізнаю…',
    );
  });

  it('lists accepted, duplicate and rejected photos, one line each', () => {
    const reply = intakeReply({
      accepted: 1,
      duplicates: 2,
      rejected: [
        { name: 'фото 3', reason: 'too-large' },
        { name: 'bill.pdf', reason: 'unsupported' },
      ],
    });
    expect(reply.split('\n')).toEqual([
      'Прийнято 1 фото, розпізнаю…',
      '2 фото вже отримано раніше.',
      'фото 3: завелике',
      expect.stringMatching(/^bill\.pdf: формат не підтримується/),
    ]);
  });

  it('falls back to the generic error when there is nothing to report', () => {
    expect(intakeReply({ accepted: 0, duplicates: 0, rejected: [] })).toBe(MESSAGES.error);
  });
});

describe('aboveLimitText', () => {
  it('shows one month without a span', () => {
    expect(aboveLimitText('ELECTRICITY', '350.5', 1, 200)).toBe(
      'Спожито 350,5 кВт·год — більше за звичні 200/міс.',
    );
  });

  it('shows the span of several months', () => {
    expect(aboveLimitText('COLD_WATER', '30', 3, 8)).toBe(
      'Спожито 30 м³ за 3 міс. — більше за звичні 8/міс.',
    );
  });

  it('shows a dash for a missing limit', () => {
    expect(aboveLimitText('GAS', '10', 1, null)).toBe('Спожито 10 м³ — більше за звичні —/міс.');
  });
});

describe('photoStatusText', () => {
  it('asks for an apartment when the meter was not found', () => {
    expect(photoStatusText(2, 'NOT_MATCHED', 'serial 123')).toBe(
      '📷 фото 2: лічильник не знайдено — serial 123. Оберіть квартиру:',
    );
  });

  it('reports a failure, with or without a note', () => {
    expect(photoStatusText(1, 'FAILED', null)).toBe('📷 фото 1: помилка розпізнавання');
    expect(photoStatusText(1, 'FAILED', 'blurry')).toBe(
      '📷 фото 1: помилка розпізнавання — blurry',
    );
  });

  it('reports a photo still being parsed', () => {
    expect(photoStatusText(1, 'PENDING', null)).toBe('📷 фото 1: розпізнаю…');
  });

  it('shows nothing for a parsed photo or no status', () => {
    expect(photoStatusText(1, 'PARSED', null)).toBeNull();
    expect(photoStatusText(1, null, null)).toBeNull();
  });
});

describe('TAP_TEXTS.batchConfirmed', () => {
  it('counts the confirmed readings, or says there was nothing', () => {
    expect(TAP_TEXTS.batchConfirmed(3)).toBe('Підтверджено: 3');
    expect(TAP_TEXTS.batchConfirmed(0)).toBe('Нічого підтверджувати');
  });
});
