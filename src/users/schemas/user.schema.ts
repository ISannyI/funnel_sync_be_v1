import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ISocialChannel, SocialChannelType } from '../interfaces/social-channel.interface';

@Schema()
export class SocialChannel implements ISocialChannel {
  @Prop({ required: true, enum: ['telegram', 'whatsapp', 'instagram'] })
  type: SocialChannelType;

  @Prop({ required: true })
  channelId: string;

  @Prop()
  accessToken?: string;

  @Prop()
  username?: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop()
  lastSync?: Date;

  @Prop({ type: Object })
  settings?: Record<string, any>;
}

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: [SocialChannel], default: [] })
  socialChannels: SocialChannel[];
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User); 