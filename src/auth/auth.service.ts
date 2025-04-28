import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Пользователь с таким email уже существует');
    }

    const user = await this.usersService.create(registerDto);
    const { password, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const userDoc = user as import('../users/schemas/user.schema').UserDocument;
    const userId = (userDoc._id as Types.ObjectId).toString();

    const payload = { email: userDoc.email, sub: userId };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userId,
        email: userDoc.email,
        name: userDoc.name,
      },
    };
  }
} 