import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('departments')
export class DepartmentsController {
  constructor(private depts: DepartmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Request() req: any) {
    return this.depts.list(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: { name: string; description?: string; keywords?: string[]; email?: string }) {
    return this.depts.create(req.user.companyId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.depts.delete(id);
  }
}