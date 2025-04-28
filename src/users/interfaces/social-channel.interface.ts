export type SocialChannelType = 'telegram' | 'whatsapp' | 'instagram';

export interface ISocialChannel {
  type: SocialChannelType;
  channelId: string;
  accessToken?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  lastSync?: Date;
  settings?: Record<string, any>;
} 