import { Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service';

@Injectable()
export class ChatService {
  constructor(private store: StoreService) {}

  async createConversation(data: { id: string; companyId: string; title?: string }) {
    return this.store.createConversation(data);
  }

  async findConversationById(id: string) {
    return this.store.findConversationById(id);
  }

  async findConversationsByCompany(companyId: string, page = 1, limit = 50, status?: string) {
    return this.store.findConversationsByCompany(companyId, status, page, limit);
  }

  async updateConversation(id: string, data: { status?: string; leadId?: string; department?: string; handledBy?: string }) {
    return this.store.updateConversation(id, data);
  }

  async createMessage(data: { id: string; conversationId: string; senderId?: string; senderType: string; content: string }) {
    return this.store.createMessage(data);
  }

  async findMessagesByConversation(conversationId: string) {
    return this.store.findMessagesByConversation(conversationId);
  }
}