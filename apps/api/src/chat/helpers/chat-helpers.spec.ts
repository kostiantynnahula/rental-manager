import { BadRequestException } from '@nestjs/common';
import type { ChatMessage } from '../../generated/prisma/client.js';
import { ChatRole, LeaseTenantRole } from '../../generated/prisma/enums.js';
import type { LeaseWithTenants } from '../../leases/helpers/lease-with-tenants.js';
import { toHistory } from './history.js';
import { toLeaseFact } from './lease-fact.js';
import { groupByRoom, toPhotoFact } from './photo-fact.js';
import { questionText } from './question.js';
import { chatSystemPrompt } from './system-prompt.js';
import { titleFromQuestion } from './title.js';

describe('questionText', () => {
  it('joins parts and trims', () => {
    expect(questionText([{ text: ' що на ' }, { text: 'кухні? ' }])).toBe('що на кухні?');
  });

  it('rejects blank text', () => {
    expect(() => questionText([{ text: '   ' }])).toThrow(BadRequestException);
    expect(() => questionText([])).toThrow(BadRequestException);
  });

  it('accepts 2000 chars, rejects 2001', () => {
    expect(questionText([{ text: 'x'.repeat(2000) }])).toHaveLength(2000);
    expect(() => questionText([{ text: 'x'.repeat(2001) }])).toThrow(BadRequestException);
  });
});

describe('titleFromQuestion', () => {
  it('keeps a short question as is, whitespace collapsed', () => {
    expect(titleFromQuestion('що  на\nкухні?', 60)).toBe('що на кухні?');
  });

  it('cuts a long question at a word boundary with an ellipsis', () => {
    const title = titleFromQuestion('слово '.repeat(30), 60);
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
    expect(title).toBe(`${'слово '.repeat(10).trim()}…`);
  });

  it('cuts one long word mid-word', () => {
    expect(titleFromQuestion('x'.repeat(100), 60)).toBe(`${'x'.repeat(60)}…`);
  });
});

describe('toHistory', () => {
  const row = (role: ChatRole, parts: unknown): ChatMessage =>
    ({ id: 'm', role, parts }) as ChatMessage;

  it('maps roles and keeps only text parts', () => {
    const [user, assistant] = toHistory([
      row(ChatRole.USER, [{ type: 'text', text: 'q' }]),
      row(ChatRole.ASSISTANT, [
        { type: 'text', text: 'a' },
        { type: 'data-sources', data: { photoIds: ['x'] } },
      ]),
    ]);
    expect(user).toMatchObject({ role: 'user', parts: [{ type: 'text', text: 'q' }] });
    expect(assistant).toMatchObject({ role: 'assistant', parts: [{ type: 'text', text: 'a' }] });
  });

  it('tolerates non-array parts', () => {
    expect(toHistory([row(ChatRole.USER, null)])[0].parts).toEqual([]);
  });
});

describe('toLeaseFact', () => {
  it('exposes dates and the primary name only, no contacts', () => {
    const lease = {
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: null,
      monthlyRent: 1500000,
      tenants: [
        { role: LeaseTenantRole.CONTACT, tenant: { fullName: 'Contact', phone: '+380111' } },
        { role: LeaseTenantRole.PRIMARY, tenant: { fullName: 'Primary', phone: '+380222' } },
      ],
    } as unknown as LeaseWithTenants;
    const fact = toLeaseFact(lease);
    expect(fact).toEqual({ startDate: '2026-01-01', endDate: null, primaryTenant: 'Primary' });
    expect(JSON.stringify(fact)).not.toContain('380');
  });
});

describe('toPhotoFact / groupByRoom', () => {
  const base = {
    id: 'p1',
    event: 'CHECK_IN',
    takenOn: new Date('2026-02-03T00:00:00Z'),
    note: 'n',
    storageKey: 'secret-key',
  };

  it('has null room/summary for an undescribed photo', () => {
    const fact = toPhotoFact({ ...base, description: null } as never);
    expect(fact).toEqual({
      photoId: 'p1',
      event: 'CHECK_IN',
      takenOn: '2026-02-03',
      room: null,
      summary: null,
      items: [],
      note: 'n',
    });
  });

  it('reads room, summary and items from the description', () => {
    const fact = toPhotoFact({
      ...base,
      description: { room: 'KITCHEN', summary: 'Мийка', items: [{ name: 'мийка' }] },
    } as never);
    expect(fact).toMatchObject({ room: 'KITCHEN', summary: 'Мийка', items: [{ name: 'мийка' }] });
  });

  it('groups by room in first-seen order, undescribed under UNKNOWN', () => {
    const f = (photoId: string, room: string | null) => ({ photoId, room }) as never;
    const groups = groupByRoom([f('1', 'KITCHEN'), f('2', null), f('3', 'KITCHEN')]);
    expect(groups.map((g) => g.room)).toEqual(['KITCHEN', 'UNKNOWN']);
    expect(groups[0].photos).toHaveLength(2);
  });
});

describe('chatSystemPrompt', () => {
  it('names the apartment, today, Ukrainian, the marker format', () => {
    const prompt = chatSystemPrompt({
      apartmentName: 'Лесі 5',
      today: new Date('2026-11-26T00:00:00Z'),
    });
    expect(prompt).toContain('Лесі 5');
    expect(prompt).toContain('2026-11-26');
    expect(prompt).toContain('українською');
    expect(prompt).toContain('[[photo:<photoId>]]');
  });
});
