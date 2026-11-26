import { NotFoundException } from '@nestjs/common';
import type { ApartmentsService } from '../apartments/apartments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ChatService } from './chat.service.js';

// vitest doesn't emit decorator metadata, so the service is built by hand with stubs.
function setup(opts: { apartment?: { isActive: boolean } | 'missing'; chat?: object | null } = {}) {
  const chat = {
    create: vi.fn().mockResolvedValue({ id: 'c1' }),
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(opts.chat === undefined ? { id: 'c1' } : opts.chat),
    update: vi.fn().mockResolvedValue({ id: 'c1' }),
    delete: vi.fn().mockResolvedValue({ id: 'c1' }),
  };
  const findOrThrow = vi.fn().mockImplementation(async () => {
    if (opts.apartment === 'missing') throw new NotFoundException('Apartment not found');
    return { id: 'a1', ...(opts.apartment ?? { isActive: true }) };
  });
  const service = new ChatService(
    { chat } as unknown as PrismaService,
    { findOrThrow } as unknown as ApartmentsService,
  );
  return { service, chat };
}

describe('ChatService', () => {
  describe('create', () => {
    it('creates an empty untitled chat for an active apartment', async () => {
      const { service, chat } = setup();
      await service.create('a1');
      expect(chat.create).toHaveBeenCalledWith({ data: { apartmentId: 'a1' } });
    });

    it('404s for an archived apartment and creates nothing', async () => {
      const { service, chat } = setup({ apartment: { isActive: false } });
      await expect(service.create('a1')).rejects.toThrow(NotFoundException);
      expect(chat.create).not.toHaveBeenCalled();
    });

    it('404s for an unknown apartment', async () => {
      const { service, chat } = setup({ apartment: 'missing' });
      await expect(service.create('a1')).rejects.toThrow(NotFoundException);
      expect(chat.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('lists the apartment chats, newest activity first, with message counts', async () => {
      const { service, chat } = setup();
      await service.list('a1');
      const arg = chat.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({ apartmentId: 'a1' });
      expect(arg.orderBy[0]).toEqual({ updatedAt: 'desc' });
      expect(arg.include).toEqual({ _count: { select: { messages: true } } });
    });

    it('still lists the chats of an archived apartment', async () => {
      const { service, chat } = setup({ apartment: { isActive: false } });
      await service.list('a1');
      expect(chat.findMany).toHaveBeenCalled();
    });

    it('404s for an unknown apartment', async () => {
      const { service } = setup({ apartment: 'missing' });
      await expect(service.list('a1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findDetailOrThrow', () => {
    it('loads messages oldest first by seq', async () => {
      const { service, chat } = setup();
      await service.findDetailOrThrow('c1');
      const include = chat.findUnique.mock.calls[0][0].include;
      expect(include.messages.orderBy).toEqual({ seq: 'asc' });
    });

    it('404s "Chat not found"', async () => {
      const { service } = setup({ chat: null });
      await expect(service.findDetailOrThrow('c1')).rejects.toThrow('Chat not found');
    });
  });

  describe('update', () => {
    it.each([
      ['Trip notes', 'Trip notes'],
      [null, null],
      ['   ', null],
      ['', null],
    ])('title %j is stored as %j', async (input, stored) => {
      const { service, chat } = setup();
      await service.update('c1', { title: input });
      expect(chat.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { title: stored } });
    });

    it('404s for an unknown chat', async () => {
      const { service, chat } = setup({ chat: null });
      await expect(service.update('c1', { title: 'x' })).rejects.toThrow('Chat not found');
      expect(chat.update).not.toHaveBeenCalled();
    });

    it('renames a chat of an archived apartment (no apartment check)', async () => {
      const { service, chat } = setup({ apartment: { isActive: false } });
      await service.update('c1', { title: 'x' });
      expect(chat.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the chat (messages cascade in the DB)', async () => {
      const { service, chat } = setup();
      await service.delete('c1');
      expect(chat.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('404s for an unknown chat', async () => {
      const { service, chat } = setup({ chat: null });
      await expect(service.delete('c1')).rejects.toThrow(NotFoundException);
      expect(chat.delete).not.toHaveBeenCalled();
    });
  });
});
