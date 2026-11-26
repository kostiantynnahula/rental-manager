import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { ApartmentChatsController } from './apartment-chats.controller.js';
import { ChatService } from './chat.service.js';
import { ChatsController } from './chats.controller.js';

@Module({
  imports: [ApartmentsModule],
  controllers: [ApartmentChatsController, ChatsController],
  providers: [ChatService],
})
export class ChatModule {}
