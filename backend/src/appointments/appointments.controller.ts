import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('appointments')
export class AppointmentsController {
  constructor(private appts: AppointmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Request() req: any) {
    return this.appts.findAll(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.appts.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { status?: string }) {
    return this.appts.update(id, dto);
  }
}