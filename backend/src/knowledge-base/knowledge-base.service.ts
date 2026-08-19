import { Injectable } from '@nestjs/common';
import { StoreService } from '../common/store.service';
import { AIService } from '../ai/ai.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private store: StoreService,
    private ai: AIService,
  ) {}

  async createDocument(companyId: string, data: { title: string; content: string; filename?: string; mime?: string; sizeBytes?: number; pageCount?: number }) {
    const chunks = this.chunkText(data.content);
    const doc = await this.store.createDocument({
      id: crypto.randomUUID(),
      companyId,
      title: data.title,
      content: data.content,
      chunks,
      filename: data.filename || null,
      mime: data.mime || null,
      sizeBytes: data.sizeBytes || 0,
      pageCount: data.pageCount || 0,
      status: 'ready',
      published: true,
      error: null,
    });

    // Generate embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.ai.generateEmbedding(chunks[i]);
      await this.store.insertChunk({
        id: crypto.randomUUID(),
        documentId: doc.id,
        companyId,
        chunkIndex: i,
        chunkText: chunks[i],
        embedding,
      });
    }

    return doc;
  }

  async findDocuments(companyId: string, page = 1, limit = 20) {
    return this.store.findDocumentsByCompanyPaged(companyId, page, limit);
  }

  async findDocumentById(id: string) {
    return this.store.findDocumentById(id);
  }

  async deleteDocument(id: string) {
    await this.store.deleteDocument(id);
  }

  async search(companyId: string, query: string, limit = 5) {
    return this.ai.searchKnowledgeBase(companyId, query, limit);
  }

  private chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end).trim());
      start += chunkSize - overlap;
    }
    return chunks.filter(c => c.length > 0);
  }
}