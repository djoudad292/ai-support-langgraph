import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { StoreService } from '../common/store.service';
import { AIService, Source } from '../ai/ai.service';

@Controller('widget')
export class WidgetController {
  constructor(
    private store: StoreService,
    private ai: AIService,
  ) {}

  @Get(':companyId/config')
  async config(@Param('companyId') companyId: string) {
    const company = await this.store.findCompanyById(companyId);
    if (!company) return { error: 'Company not found' };
    return {
      companyId: company.id,
      companyName: company.name,
      primaryColor: company.settings?.primaryColor || '#2563eb',
      welcomeMessage: company.settings?.welcomeMessage || 'Hi! How can I help you today?',
    };
  }

  @Post('ask')
  async ask(@Body() dto: { question: string; companyId: string }) {
    const results = await this.ai.searchKnowledgeBase(dto.companyId, dto.question, 5);
    const context = results.map(r => r.chunkText).join('\n\n').slice(0, 7000);
    if (!context) {
      return { answer: "I couldn't find relevant information.", sources: [] };
    }
    return {
      answer: `Based on our knowledge base: ${context.slice(0, 500)}`,
      sources: results,
    };
  }
}