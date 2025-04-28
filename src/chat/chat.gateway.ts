import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TelegramService } from '../telegram/telegram.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();

  constructor(
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      this.connectedClients.set(payload.sub, client);
      console.log(`Client connected: ${payload.sub}`);

      // Отправляем непрочитанные сообщения при подключении
      const unreadMessages = await this.chatService.getUnreadMessages(payload.sub);
      if (unreadMessages.length > 0) {
        client.emit('unreadMessages', unreadMessages);
        await this.chatService.markMessagesAsRead(payload.sub);
      }

      // Отправляем историю чата
      const chatHistory = await this.chatService.getChatHistory(payload.sub);
      client.emit('chatHistory', chatHistory);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socket] of this.connectedClients.entries()) {
      if (socket === client) {
        this.connectedClients.delete(userId);
        console.log(`Client disconnected: ${userId}`);
        break;
      }
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, data: { chatId: string; message: string }) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Сохраняем сообщение в базе
      await this.chatService.createMessage(
        data.chatId,
        payload.sub,
        'user',
        data.message
      );

      // Отправляем сообщение в Telegram
      await this.telegramService.sendMessage(payload.sub, data.chatId, data.message);
      
      // Отправляем сообщение всем подключенным клиентам
      this.server.emit('newMessage', {
        chatId: data.chatId,
        message: data.message,
        senderId: payload.sub,
        senderType: 'user',
        timestamp: new Date(),
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  // Метод для обработки входящих сообщений от Telegram
  async handleTelegramMessage(chatId: string, message: string, botId: string) {
    try {
      // Сохраняем сообщение в базе
      await this.chatService.createMessage(
        chatId,
        botId,
        'bot',
        message
      );

      // Отправляем сообщение всем подключенным клиентам
      this.server.emit('newMessage', {
        chatId,
        message,
        senderId: botId,
        senderType: 'bot',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to handle Telegram message:', error);
    }
  }
} 