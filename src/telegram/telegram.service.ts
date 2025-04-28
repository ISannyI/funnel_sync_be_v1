import { Injectable, OnModuleInit, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGateway } from '../chat/chat.gateway';
import * as TelegramBot from 'node-telegram-bot-api';
import { UsersService } from '../users/users.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private connectedBots: Map<string, TelegramBot> = new Map();

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    private usersService: UsersService,
  ) {}

  async onModuleInit() {
    // Восстанавливаем все активные Telegram-боты из базы данных
    await this.restoreActiveChannels();
  }

  private setupBotHandlers(bot: TelegramBot, userId: string, botId: string) {
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      // Передаем сообщение в чат-шлюз
      await this.chatGateway.handleTelegramMessage(chatId.toString(), text, botId);
    });
  }

  async connectAccount(userId: string, accessToken: string) {
    try {
      const bot = new TelegramBot(accessToken, { polling: true });
      const botInfo = await bot.getMe();
      // Проверяем, есть ли уже канал с этим channelId
      const channels = await this.usersService.getSocialChannels(userId, 'telegram');
      const existingChannel = channels.find(ch => ch.channelId === botInfo.id.toString());
      if (existingChannel && existingChannel.isActive) {
        throw new BadRequestException('This Telegram bot is already connected and active');
      }
      if (existingChannel && !existingChannel.isActive) {
        // Реактивируем канал
        await this.usersService.updateSocialChannel(userId, 'telegram', botInfo.id.toString(), {
          accessToken,
          username: botInfo.username,
          firstName: botInfo.first_name,
          lastName: botInfo.last_name,
          isActive: true,
          lastSync: new Date(),
        });
      } else {
        // Добавляем канал в профиль пользователя
        await this.usersService.addSocialChannel(userId, {
          type: 'telegram',
          channelId: botInfo.id.toString(),
          accessToken,
          username: botInfo.username,
          firstName: botInfo.first_name,
          lastName: botInfo.last_name,
          isActive: true,
          lastSync: new Date(),
        });
      }
      this.setupBotHandlers(bot, userId, botInfo.id.toString());
      this.connectedBots.set(userId, bot);
      return {
        success: true,
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          firstName: botInfo.first_name,
          lastName: botInfo.last_name,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to connect Telegram account: ${error.message}`);
    }
  }

  async sendMessage(userId: string, chatId: string, message: string) {
    const userChannels = await this.usersService.getSocialChannels(userId, 'telegram');
    const channel = userChannels.find(ch => ch.isActive);
    if (!channel || !channel.accessToken) {
      throw new NotFoundException('No active Telegram channel found');
    }
    let bot = this.connectedBots.get(userId);
    if (!bot) {
      bot = new TelegramBot(channel.accessToken, { polling: true });
      this.setupBotHandlers(bot, userId, channel.channelId);
      this.connectedBots.set(userId, bot);
    }
    try {
      await bot.sendMessage(chatId, message);
    } catch (error) {
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }
  }

  async disconnectAccount(userId: string, channelId: string) {
    try {
      const bot = this.connectedBots.get(userId);
      if (!bot) {
        throw new NotFoundException('Bot is not running for this user');
      }
      bot.stopPolling();
      this.connectedBots.delete(userId);
      // Обновляем статус канала на неактивный
      await this.usersService.updateSocialChannel(userId, 'telegram', channelId, { isActive: false });
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to disconnect Telegram account: ${error.message}`);
    }
  }

  async deleteChannel(userId: string, channelId: string) {
    try {
      // Останавливаем бота, если он запущен
      const bot = this.connectedBots.get(userId);
      if (bot) {
        bot.stopPolling();
        this.connectedBots.delete(userId);
      }
      const channels = await this.usersService.getSocialChannels(userId, 'telegram');
      const channel = channels.find(ch => ch.channelId === channelId);
      if (!channel) {
        throw new NotFoundException('Telegram channel not found');
      }
      await this.usersService.removeSocialChannel(userId, 'telegram', channelId);
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(`Failed to delete Telegram channel: ${error.message}`);
    }
  }

  async startChannel(userId: string, channelId: string) {
    try {
      const channels = await this.usersService.getSocialChannels(userId, 'telegram');
      const channel = channels.find(ch => ch.channelId === channelId);
      if (!channel || !channel.accessToken) {
        throw new NotFoundException('Telegram channel not found or accessToken missing');
      }
      if (this.connectedBots.has(userId)) {
        throw new BadRequestException('Bot is already running for this user');
      }
      const bot = new TelegramBot(channel.accessToken, { polling: true });
      this.setupBotHandlers(bot, userId, channel.channelId);
      this.connectedBots.set(userId, bot);
      // Обновляем статус канала на активный
      await this.usersService.updateSocialChannel(userId, 'telegram', channelId, { isActive: true });
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to start Telegram channel: ${error.message}`);
    }
  }

  async restoreActiveChannels() {
    const users = await this.usersService.findAll();
    for (const user of users) {
      const telegramChannels = user.socialChannels.filter(
        channel => channel.type === 'telegram' && channel.isActive && channel.accessToken
      );
      for (const channel of telegramChannels) {
        if (!this.connectedBots.has(user.id)) {
          try {
            const bot = new TelegramBot(channel.accessToken, { polling: true });
            this.setupBotHandlers(bot, user.id, channel.channelId);
            this.connectedBots.set(user.id, bot);
            console.log(`Restored Telegram bot for user ${user.id}, channel ${channel.channelId}`);
          } catch (err) {
            console.error(`Failed to restore bot for user ${user.id}, channel ${channel.channelId}:`, err.message);
            // Меняем статус канала на неактивный
            await this.usersService.updateSocialChannel(user.id, 'telegram', channel.channelId, { isActive: false });
          }
        }
      }
    }
  }
} 