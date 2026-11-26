import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChatRole } from '../generated/prisma/enums.js';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';

async function errorsFor(body: object) {
  return validate(plainToInstance(UpdateChatDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateChatDto', () => {
  it.each([['a title'], [null], ['   '], ['x'.repeat(100)], ['  ' + 'x'.repeat(100) + '  ']])(
    'accepts %j',
    async (title) => {
      expect(await errorsFor({ title })).toHaveLength(0);
    },
  );

  it('rejects a title longer than 100 after trimming', async () => {
    expect(await errorsFor({ title: 'x'.repeat(101) })).not.toHaveLength(0);
  });

  it('rejects a missing title key', async () => {
    expect(await errorsFor({})).not.toHaveLength(0);
  });

  it('rejects a non-string title', async () => {
    expect(await errorsFor({ title: 5 })).not.toHaveLength(0);
  });
});

describe('ChatMessageResponseDto.from', () => {
  const row = {
    id: 'm1',
    chatId: 'c1',
    role: ChatRole.USER,
    seq: 7,
    createdAt: new Date('2026-11-26T10:00:00Z'),
  };

  it('returns id, role, parts and createdAt without internal fields', () => {
    const parts = [{ type: 'text', text: 'hi' }];
    const dto = ChatMessageResponseDto.from({ ...row, parts } as never);
    expect(dto).toEqual({ id: 'm1', role: 'USER', parts, createdAt: row.createdAt });
  });

  it.each([[null], [{ type: 'text' }], ['x']])(
    'falls back to [] for non-array parts %j',
    (parts) => {
      expect(ChatMessageResponseDto.from({ ...row, parts } as never).parts).toEqual([]);
    },
  );
});
