import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(opts: { to: string; subject: string; text: string }): Promise<boolean> {
    this.logger.log(`Email to ${opts.to}: ${opts.subject}`);
    return true;
  }
}
