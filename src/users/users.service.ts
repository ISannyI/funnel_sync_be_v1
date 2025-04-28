import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { ISocialChannel, SocialChannelType } from './interfaces/social-channel.interface';

interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async create(registerDto: RegisterDto): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const createdUser = new this.userModel({
      ...registerDto,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    try {
      const objectId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
      return this.userModel.findById(objectId).exec();
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async addSocialChannel(userId: string, channelData: ISocialChannel): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Проверяем, нет ли уже такого канала
    const existingChannel = user.socialChannels.find(
      channel => channel.type === channelData.type && channel.channelId === channelData.channelId
    );

    if (existingChannel) {
      // Обновляем существующий канал
      Object.assign(existingChannel, channelData);
    } else {
      // Добавляем новый канал
      user.socialChannels.push(channelData);
    }

    return user.save();
  }

  async removeSocialChannel(userId: string, type: SocialChannelType, channelId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.socialChannels = user.socialChannels.filter(
      channel => !(channel.type === type && channel.channelId === channelId)
    );

    return user.save();
  }

  async updateSocialChannel(
    userId: string, 
    type: SocialChannelType, 
    channelId: string, 
    updateData: Partial<ISocialChannel>
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const channel = user.socialChannels.find(
      ch => ch.type === type && ch.channelId === channelId
    );

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    Object.assign(channel, updateData);
    return user.save();
  }

  async getSocialChannels(userId: string, type?: SocialChannelType): Promise<ISocialChannel[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (type) {
      return user.socialChannels.filter(channel => channel.type === type);
    }
    return user.socialChannels;
  }
} 