import { parseReplyTo } from './reply-target.js';

describe('parseReplyTo', () => {
  it('parses a private chat', () => {
    expect(parseReplyTo('123456:42')).toEqual({ chatId: 123456, messageId: 42 });
  });

  it('parses a group chat (negative id)', () => {
    expect(parseReplyTo('-1001234567890:7')).toEqual({ chatId: -1001234567890, messageId: 7 });
  });

  it.each(['', 'abc', '123', '123:', ':42', '1:2:3', '1:-2', '1.5:2', ' 1:2'])(
    'returns null for %j',
    (value) => {
      expect(parseReplyTo(value)).toBeNull();
    },
  );
});
