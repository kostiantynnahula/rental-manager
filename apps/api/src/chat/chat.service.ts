import { Injectable, NotFoundException } from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import type { Chat } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';
import { type ChatListItem, chatListItemInclude } from './helpers/chat-list-item.js';
import { type ChatWithMessages, chatWithMessagesInclude } from './helpers/chat-with-messages.js';
import { cleanTitle } from './helpers/title.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apartments: ApartmentsService,
  ) {}

  // Untitled: #159 sets the title from the first question.
  async create(apartmentId: string): Promise<Chat> {
    const apartment = await this.apartments.findOrThrow(apartmentId);
    // 404, as condition photos: an archived apartment gets no new chats.
    if (!apartment.isActive) throw new NotFoundException('Apartment is archived');
    return this.prisma.chat.create({ data: { apartmentId } });
  }

  // Most recently active first. An archived apartment's chats are still listed.
  async list(apartmentId: string): Promise<ChatListItem[]> {
    await this.apartments.findOrThrow(apartmentId);
    return this.prisma.chat.findMany({
      where: { apartmentId },
      include: chatListItemInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findOrThrow(id: string): Promise<Chat> {
    const chat = await this.prisma.chat.findUnique({ where: { id } });
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async findDetailOrThrow(id: string): Promise<ChatWithMessages> {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      include: chatWithMessagesInclude,
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async update(id: string, dto: UpdateChatDto): Promise<Chat> {
    await this.findOrThrow(id);
    return this.prisma.chat.update({ where: { id }, data: { title: cleanTitle(dto.title) } });
  }

  // Messages go with it (ON DELETE CASCADE).
  async delete(id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.prisma.chat.delete({ where: { id } });
  }
}
