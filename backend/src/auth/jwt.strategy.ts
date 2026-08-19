import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { StoreService } from '../common/store.service';
import { JWT_SECRET } from '../common/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private store: StoreService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET(),
    });
  }

  async validate(payload: any) {
    const user = await this.store.findUserById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return { sub: user.id, companyId: user.company_id, role: user.role };
  }
}