import { Controller, Post, Get, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private kb: KnowledgeBaseService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: { title: string; content: string; filename?: string; mime?: string; sizeBytes?: number; pageCount?: number }) {
    return this.kb.createDocument(req.user.companyId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.kb.findDocuments(req.user.companyId, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.kb.findDocumentById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.kb.deleteDocument(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('search')
  search(@Request() req: any, @Body() dto: { query: string; limit?: number }) {
    return this.kb.search(req.user.companyId, dto.query, dto.limit);
  }
}