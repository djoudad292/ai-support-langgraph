import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { StoreService } from '../common/store.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private store: StoreService) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async summary(@Request() req: any) {
    const [convs, leads, appts] = await Promise.all([
      this.store.countConversations(req.user.companyId),
      this.store.countLeads(req.user.companyId),
      this.store.countAppointments(req.user.companyId),
    ]);
    const aiConvs = await this.store.getRaw<{ count: number }>(
      `SELECT count(*)::int as count FROM conversations WHERE company_id = $1 AND handled_by = 'ai'`,
      [req.user.companyId],
    );
    const humanConvs = await this.store.getRaw<{ count: number }>(
      `SELECT count(*)::int as count FROM conversations WHERE company_id = $1 AND handled_by = 'human'`,
      [req.user.companyId],
    );
    return {
      totalConversations: convs,
      totalLeads: leads,
      totalAppointments: appts,
      aiHandled: aiConvs[0]?.count || 0,
      humanHandled: humanConvs[0]?.count || 0,
    };
  }
}