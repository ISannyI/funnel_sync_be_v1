import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { UserId } from '../auth/decorators/user.decorator';

@Controller('telegram')
@UseGuards(JwtAuthGuard)
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly usersService: UsersService,
  ) {}

  @Post('connect')
  async connectAccount(@Body() body: { accessToken: string }, @UserId() userId: string) {
    return this.telegramService.connectAccount(userId, body.accessToken);
  }

  @Post('send-message')
  async sendMessage(
    @Body() body: { chatId: string; message: string },
    @UserId() userId: string,
  ) {
    return this.telegramService.sendMessage(userId, body.chatId, body.message);
  }

  @Get('accounts')
  async getConnectedAccounts(@UserId() userId: string) {
    const channels = await this.usersService.getSocialChannels(userId, 'telegram');
    return channels.map(channel => ({
      id: channel.channelId,
      username: channel.username,
      firstName: channel.firstName,
      lastName: channel.lastName,
      isActive: channel.isActive,
      lastSync: channel.lastSync,
    }));
  }

  @Post('disconnect/:channelId')
  async disconnectAccount(@UserId() userId: string, @Param('channelId') channelId: string) {
    return this.telegramService.disconnectAccount(userId, channelId);
  }

  @Post('delete/:channelId')
  async deleteChannel(@UserId() userId: string, @Param('channelId') channelId: string) {
    return this.telegramService.deleteChannel(userId, channelId);
  }

  @Post('start/:channelId')
  async startChannel(@UserId() userId: string, @Param('channelId') channelId: string) {
    return this.telegramService.startChannel(userId, channelId);
  }
} 