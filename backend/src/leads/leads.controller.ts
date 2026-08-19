import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('leads')
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Request() req: any) {
    return this.leads.findAll(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.leads.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; email?: string; phone?: string; department?: string; status?: string }) {
    return this.leads.update(id, dto);
  }
}