import { inlineKeyboard } from './inline-keyboard.js';

describe('inlineKeyboard', () => {
  it('maps rows of buttons to callback buttons', () => {
    expect(
      inlineKeyboard([
        [{ text: 'Підтвердити', data: 'rc:a:b' }],
        [
          { text: 'A', data: 'as:x:y' },
          { text: 'B', data: 'as:x:z' },
        ],
      ]),
    ).toEqual({
      inline_keyboard: [
        [{ text: 'Підтвердити', callback_data: 'rc:a:b' }],
        [
          { text: 'A', callback_data: 'as:x:y' },
          { text: 'B', callback_data: 'as:x:z' },
        ],
      ],
    });
  });

  it('returns an empty keyboard for no buttons (removes the buttons of an edited message)', () => {
    expect(inlineKeyboard([])).toEqual({ inline_keyboard: [] });
  });
});
