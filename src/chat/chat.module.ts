import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { TelegramModule } from '../telegram/telegram.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatService } from './chat.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    forwardRef(() => TelegramModule),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    CommonModule,
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatGateway],
})
export class ChatModule {} 