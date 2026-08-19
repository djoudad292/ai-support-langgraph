import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AIService, ReceptionistResult, Source } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

interface ChatDto {
  message: string;
  history?: { senderType: string; content: string }[];
  conversationId?: string;
}

interface AskDto {
  question: string;
}

@Controller('ai')
export class AIController {
  constructor(private ai: AIService) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto, @Request() req: any): Promise<ReceptionistResult> {
    const companyId = req.user?.companyId || 'public';
    return this.ai.generateResponse(companyId, dto.message, dto.history, dto.conversationId);
  }

  @Post('ask')
  async ask(@Body() dto: AskDto, @Request() req: any): Promise<{ answer: string; sources: Source[] }> {
    const companyId = req.user?.companyId || 'public';
    // Simple RAG ask - search KB and generate answer
    const results = await this.ai.searchKnowledgeBase(companyId, dto.question, 5);
    const context = results.map(r => r.chunkText).join('\n\n').slice(0, 7000);
    if (!context) {
      return { answer: "I couldn't find relevant information.", sources: [] };
    }
    // For now just return the context - in production use LLM to generate answer
    return {
      answer: `Based on our knowledge base: ${context.slice(0, 500)}`,
      sources: results,
    };
  }
}