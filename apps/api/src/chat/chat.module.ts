import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { ConditionPhotosModule } from '../condition-photos/condition-photos.module.js';
import { LeasesModule } from '../leases/leases.module.js';
import { ApartmentChatsController } from './apartment-chats.controller.js';
import { ChatAgentService } from './chat-agent.service.js';
import { ChatService } from './chat.service.js';
import { ChatsController } from './chats.controller.js';

@Module({
  imports: [ApartmentsModule, ConditionPhotosModule, LeasesModule],
  controllers: [ApartmentChatsController, ChatsController],
  providers: [ChatService, ChatAgentService],
})
export class ChatModule {}
