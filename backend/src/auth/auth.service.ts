import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { StoreService } from '../common/store.service';

@Injectable()
export class AuthService {
  constructor(
    private store: StoreService,
    private jwt: JwtService,
  ) {}

  async register(email: string, password: string, companyName: string) {
    const existing = await this.store.findUserByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const companyId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await this.store.createCompany({
      id: companyId,
      name: companyName,
      slug: companyName.toLowerCase().replace(/\s+/g, '-'),
      plan: 'free',
      settings: {},
    });

    const user = await this.store.createUser({
      id: userId,
      email,
      password_hash: passwordHash,
      name: companyName,
      role: 'admin',
      company_id: companyId,
    });

    const token = this.jwt.sign({ sub: userId, companyId, role: user.role });
    return { access_token: token, user: { id: userId, email, name: user.name, role: user.role, companyId } };
  }

  async login(email: string, password: string) {
    const user = await this.store.findUserByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id, companyId: user.company_id, role: user.role });
    return { access_token: token, user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.company_id } };
  }

  async me(userId: string) {
    const user = await this.store.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.company_id };
  }
}