import { Injectable, Logger } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { StoreService } from '../common/store.service';
import { MailService } from '../common/mail.service';

const EMBEDDING_DIM = 1536;

export interface Source {
  chunkText: string;
  similarity: number;
  documentTitle?: string | null;
}

export interface ReceptionistResult {
  response: string;
  source: 'ai' | 'escalate';
  confidence: number;
  intent: 'question' | 'appointment' | 'lead_capture' | 'routing' | 'escalate' | 'other';
  department?: string | null;
  lead?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  appointment?: { date?: string | null; time?: string | null; title?: string | null } | null;
  sources: Source[];
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private embeddings?: OpenAIEmbeddings;

  constructor(
    private store: StoreService,
    private mail: MailService,
  ) {
    if (process.env.OPENROUTER_API_KEY) {
      this.embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        apiKey: process.env.OPENROUTER_API_KEY,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
        },
      });
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.embeddings) {
      try {
        const embedding = await this.withTimeout(this.embeddings.embedQuery(text), 15000);
        if (embedding?.length) return embedding;
      } catch (err) {
        this.logger.warn(`OpenAI embedding failed, using local fallback: ${(err as Error).message}`);
      }
    }
    return this.embedLocally(text);
  }

  private embedLocally(text: string): number[] {
    const vector = new Array(EMBEDDING_DIM).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const grams: string[] = [];
    for (const word of normalized.split(/\s+/)) {
      if (!word) continue;
      grams.push(word);
      if (word.length > 2) {
        grams.push(word.slice(0, 5));
        grams.push(word.slice(-5));
      }
    }
    const joined = normalized.replace(/\s+/g, '');
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i + n <= joined.length; i++) {
        grams.push(joined.slice(i, i + n));
      }
    }
    for (const g of grams) {
      const h = hashString(g);
      const idx = Math.abs(h) % EMBEDDING_DIM;
      vector[idx] += (h & 1) === 0 ? 1 : -1;
    }
    let mag = 0;
    for (const v of vector) mag += v * v;
    mag = Math.sqrt(mag) || 1;
    return vector.map((v) => v / mag);
  }

  // RAG search
  async searchKnowledgeBase(companyId: string, query: string, limit = 10): Promise<Source[]> {
    const totalChunks = await this.store.countChunks(companyId);
    if (totalChunks === 0) return [];
    try {
      const embedding = await this.withTimeout(this.generateEmbedding(query), 15000);
      const results = await this.store.searchChunks(companyId, embedding, limit, 0.2);
      return results.map((r) => ({
        chunkText: r.chunk_text,
        similarity: r.similarity,
        documentTitle: r.document_title || null,
      }));
    } catch (err) {
      this.logger.warn(`KB search failed: ${(err as Error).message}`);
      return [];
    }
  }

  async ragSearchPublic(companyId: string, query: string, limit = 5) {
    const totalChunks = await this.store.countChunks(companyId);
    if (totalChunks === 0) return { context: '', results: [], bestSimilarity: 0 };
    try {
      const embedding = await this.withTimeout(this.generateEmbedding(query), 15000);
      const threshold = this.embeddings ? 0.2 : 0.08;
      const results = await this.store.searchChunks(companyId, embedding, limit, threshold);
      const filtered = results.filter((r) => r.similarity >= threshold);
      const bestSimilarity = filtered.length > 0 ? filtered[0].similarity : 0;
      const context = filtered
        .map((r) => (r.document_title ? `[${r.document_title}]\n${r.chunk_text}` : r.chunk_text))
        .join('\n\n')
        .slice(0, 6000);
      const sources: Source[] = filtered.map((r) => ({
        chunkText: r.chunk_text,
        similarity: r.similarity,
        documentTitle: r.document_title || null,
      }));
      return { context, results: sources, bestSimilarity };
    } catch (err) {
      this.logger.warn(`RAG search failed: ${(err as Error).message}`);
      return { context: '', results: [], bestSimilarity: 0 };
    }
  }

  // Receptionist orchestration — powered by LangGraph
  async generateResponse(
    companyId: string,
    userMessage: string,
    history?: { senderType: string; content: string }[],
    conversationId?: string,
  ): Promise<ReceptionistResult> {
    try {
      const { runReceptionistGraph } = await import('./langgraph/agent.graph');
      const lgResult = await runReceptionistGraph({
        userMessage,
        companyId,
        conversationId,
        history,
        store: this.store,
        aiService: this,
      });

      const result: ReceptionistResult = {
        response: lgResult.response,
        source: lgResult.source,
        confidence: lgResult.source === 'ai' ? 0.9 : 0,
        intent: lgResult.intent,
        department: lgResult.department,
        lead: lgResult.lead,
        appointment: lgResult.appointment,
        sources: lgResult.sources,
      };

      if (conversationId) {
        await this.persistSideEffects(companyId, conversationId, result);
      }

      return result;
    } catch (err) {
      this.logger.error(`LangGraph agent failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private async persistSideEffects(companyId: string, conversationId: string, result: ReceptionistResult) {
    const conversation = await this.store.findConversationById(conversationId);
    if (!conversation) return;

    // Department routing
    if (result.department && conversation.department !== result.department) {
      await this.store.updateConversation(conversationId, { department: result.department });
    }

    // Lead capture
    const leadInfo = result.lead;
    if (leadInfo && (leadInfo.email || leadInfo.phone || leadInfo.name)) {
      let lead = await this.store.findLeadByConversation(conversationId);
      if (lead) {
        await this.store.updateLead(lead.id, {
          name: leadInfo.name || lead.name || undefined,
          email: leadInfo.email || lead.email || undefined,
          phone: leadInfo.phone || lead.phone || undefined,
          department: result.department || lead.department || undefined,
        });
      } else {
        lead = await this.store.createLead({
          id: crypto.randomUUID(),
          companyId,
          conversationId,
          name: leadInfo.name || null,
          email: leadInfo.email || null,
          phone: leadInfo.phone || null,
          message: null,
          source: 'chat',
          status: 'new',
          department: result.department || null,
        });
        await this.store.updateConversation(conversationId, { leadId: lead.id });
      }
    }

    // Appointment booking
    const appt = result.appointment;
    if (appt && appt.date && appt.time) {
      const metadata = conversation.metadata || {};
      if (!metadata.appointmentBooked) {
        const startTime = parseAppointmentDateTime(appt.date, appt.time);
        if (startTime) {
          const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
          const lead = await this.store.findLeadByConversation(conversationId);
          await this.store.createAppointment({
            id: crypto.randomUUID(),
            companyId,
            conversationId,
            leadId: lead?.id || null,
            customerName: lead?.name || result.lead?.name || null,
            customerEmail: lead?.email || null,
            title: appt.title || 'Scheduled meeting',
            notes: null,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            status: 'requested',
          });
          await this.store.updateConversation(conversationId, {
            metadata: { ...metadata, appointmentBooked: true },
          });
        }
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`AI request timed out after ${ms}ms`)), ms),
      ),
    ]);
  }
}

function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function parseAppointmentDateTime(dateStr: string, timeStr: string): Date | null {
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!timeMatch || !dateMatch) return null;
  const hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const date = new Date(
    parseInt(dateMatch[1], 10),
    parseInt(dateMatch[2], 10) - 1,
    parseInt(dateMatch[3], 10),
    hour,
    minute,
  );
  return isNaN(date.getTime()) ? null : date;
}