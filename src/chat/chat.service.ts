import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './schemas/message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async createMessage(chatId: string, senderId: string, senderType: 'user' | 'bot', content: string) {
    const message = new this.messageModel({
      chatId,
      senderId,
      senderType,
      content,
    });
    return message.save();
  }

  async getUnreadMessages(userId: string) {
    return this.messageModel.find({
      chatId: userId,
      isRead: false,
    }).sort({ timestamp: 1 }).exec();
  }

  async markMessagesAsRead(chatId: string) {
    return this.messageModel.updateMany(
      { chatId, isRead: false },
      { $set: { isRead: true } }
    ).exec();
  }

  async getChatHistory(chatId: string, limit: number = 50) {
    return this.messageModel.find({ chatId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
} 