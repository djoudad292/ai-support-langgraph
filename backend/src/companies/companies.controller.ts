import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('companies')
export class CompaniesController {
  constructor(private companies: CompaniesService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.companies.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; settings?: any }) {
    return this.companies.update(id, dto);
  }
}