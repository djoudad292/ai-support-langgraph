import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  list(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 50, @Query('status') status?: string) {
    return this.chat.findConversationsByCompany(req.user.companyId, page, limit, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id')
  get(@Param('id') id: string) {
    return this.chat.findConversationById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id/messages')
  messages(@Param('id') id: string) {
    return this.chat.findMessagesByConversation(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations')
  create(@Request() req: any, @Body() dto: { title?: string }) {
    return this.chat.createConversation({ id: crypto.randomUUID(), companyId: req.user.companyId, title: dto.title });
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/messages')
  addMessage(@Param('id') id: string, @Request() req: any, @Body() dto: { content: string; senderType: string }) {
    return this.chat.createMessage({
      id: crypto.randomUUID(),
      conversationId: id,
      senderId: req.user.sub,
      senderType: dto.senderType,
      content: dto.content,
    });
  }
}