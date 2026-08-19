import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class StoreService {
  constructor(private db: DatabaseService) {}

  async getRaw<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<T[]> {
    return this.db.query<T>(text, params);
  }

  // Users
  async createUser(data: { id: string; email: string; password_hash: string; name: string; role: string; company_id: string }) {
    const rows = await this.db.query(
      `INSERT INTO users (id, email, password_hash, name, role, company_id, token_version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,0,now(),now()) RETURNING *`,
      [data.id, data.email, data.password_hash, data.name, data.role, data.company_id],
    );
    return rows[0];
  }

  async findUserByEmail(email: string) {
    return this.db.queryOne(`SELECT * FROM users WHERE email = $1`, [email]);
  }

  async findUserById(id: string) {
    return this.db.queryOne(`SELECT * FROM users WHERE id = $1`, [id]);
  }

  // Companies
  async createCompany(data: { id: string; name: string; slug: string; plan: string; settings: any }) {
    const rows = await this.db.query(
      `INSERT INTO companies (id, name, slug, plan, settings, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,now(),now()) RETURNING *`,
      [data.id, data.name, data.slug, data.plan, JSON.stringify(data.settings || {})],
    );
    return rows[0];
  }

  async findCompanyById(id: string) {
    return this.db.queryOne(`SELECT * FROM companies WHERE id = $1`, [id]);
  }

  async updateCompany(id: string, data: { name?: string; settings?: any }) {
    const sets: string[] = ['updated_at = now()'];
    const params: any[] = [id];
    let i = 2;
    if (data.name !== undefined) { sets.push(`name = $${i++}`); params.push(data.name); }
    if (data.settings !== undefined) { sets.push(`settings = $${i++}`); params.push(JSON.stringify(data.settings)); }
    const rows = await this.db.query(`UPDATE companies SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  }

  // Conversations
  async createConversation(data: { id: string; companyId: string; title?: string; status?: string }) {
    const rows = await this.db.query(
      `INSERT INTO conversations (id, company_id, title, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,now(),now()) RETURNING *`,
      [data.id, data.companyId, data.title || 'New Conversation', data.status || 'active'],
    );
    return rows[0];
  }

  async findConversationById(id: string) {
    return this.db.queryOne(`SELECT * FROM conversations WHERE id = $1`, [id]);
  }

  async findConversationsByCompany(companyId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const params: any[] = [companyId, limit, offset];
    let where = 'WHERE company_id = $1';
    if (status) { where += ' AND status = $4'; params.push(status); }
    const countRow = await this.db.queryOne(`SELECT count(*)::int as total FROM conversations ${where}`, status ? [companyId, status] : [companyId]);
    const rows = await this.db.query(`SELECT * FROM conversations ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`, params);
    return { items: rows, total: countRow?.total || 0 };
  }

  async updateConversation(id: string, data: { status?: string; leadId?: string; department?: string; handledBy?: string; metadata?: any }) {
    const sets: string[] = ['updated_at = now()'];
    const params: any[] = [id];
    let i = 2;
    if (data.status !== undefined) { sets.push(`status = $${i++}`); params.push(data.status); }
    if (data.leadId !== undefined) { sets.push(`lead_id = $${i++}`); params.push(data.leadId); }
    if (data.department !== undefined) { sets.push(`department = $${i++}`); params.push(data.department); }
    if (data.handledBy !== undefined) { sets.push(`handled_by = $${i++}`); params.push(data.handledBy); }
    if (data.metadata !== undefined) { sets.push(`metadata = $${i++}`); params.push(JSON.stringify(data.metadata)); }
    const rows = await this.db.query(`UPDATE conversations SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  }

  // Messages
  async createMessage(data: { id: string; conversationId: string; senderId?: string; senderType: string; content: string; metadata?: any }) {
    const rows = await this.db.query(
      `INSERT INTO messages (id, conversation_id, sender_id, sender_type, content, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,now()) RETURNING *`,
      [data.id, data.conversationId, data.senderId || null, data.senderType, data.content, data.metadata ? JSON.stringify(data.metadata) : null],
    );
    return rows[0];
  }

  async findMessagesByConversation(conversationId: string) {
    return this.db.query(`SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, [conversationId]);
  }

  // Documents
  async createDocument(data: any) {
    const rows = await this.db.query(
      `INSERT INTO documents (id, company_id, title, content, chunks, filename, mime, size_bytes, page_count, status, published, error, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now()) RETURNING *`,
      [data.id, data.companyId, data.title, data.content, data.chunks || [], data.filename, data.mime, data.sizeBytes || 0, data.pageCount || 0, data.status || 'ready', data.published !== false, data.error],
    );
    return rows[0];
  }

  async findDocumentById(id: string) {
    return this.db.queryOne(`SELECT * FROM documents WHERE id = $1`, [id]);
  }

  async findDocumentsByCompany(companyId: string) {
    return this.db.query(`SELECT * FROM documents WHERE company_id = $1 ORDER BY created_at DESC`, [companyId]);
  }

  async findDocumentsByCompanyPaged(companyId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const countRow = await this.db.queryOne(`SELECT count(*)::int as total FROM documents WHERE company_id = $1`, [companyId]);
    const rows = await this.db.query(`SELECT * FROM documents WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [companyId, limit, offset]);
    return { items: rows, total: countRow?.total || 0 };
  }

  async findPublishedDocuments(companyId: string) {
    return this.db.query(`SELECT * FROM documents WHERE company_id = $1 AND published = true ORDER BY created_at DESC`, [companyId]);
  }

  async updateDocument(id: string, data: { title?: string; published?: boolean }) {
    const sets: string[] = ['updated_at = now()'];
    const params: any[] = [id];
    let i = 2;
    if (data.title !== undefined) { sets.push(`title = $${i++}`); params.push(data.title); }
    if (data.published !== undefined) { sets.push(`published = $${i++}`); params.push(data.published); }
    const rows = await this.db.query(`UPDATE documents SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  }

  async deleteDocument(id: string) {
    await this.db.query(`DELETE FROM chunks WHERE document_id = $1`, [id]);
    await this.db.query(`DELETE FROM documents WHERE id = $1`, [id]);
  }

  // Chunks
  async insertChunk(data: { id: string; documentId: string; companyId: string; chunkIndex: number; chunkText: string; embedding: number[] }) {
    const embeddingStr = `[${data.embedding.join(',')}]`;
    const rows = await this.db.query(
      `INSERT INTO chunks (id, document_id, company_id, chunk_index, chunk_text, embedding, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::vector,now()) RETURNING *`,
      [data.id, data.documentId, data.companyId, data.chunkIndex, data.chunkText, embeddingStr],
    );
    return rows[0];
  }

  async countChunks(companyId: string) {
    const row = await this.db.queryOne(`SELECT count(*)::int as count FROM chunks WHERE company_id = $1`, [companyId]);
    return row?.count || 0;
  }

  async searchChunks(companyId: string, embedding: number[], limit = 10, threshold = 0.2) {
    const embeddingStr = `[${embedding.join(',')}]`;
    return this.db.query(
      `SELECT c.*, d.title as document_title,
              1 - (c.embedding <=> $1::vector) as similarity
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.company_id = $2 AND d.published = true
       HAVING 1 - (c.embedding <=> $1::vector) >= $4
       ORDER BY c.embedding <=> $1::vector
       LIMIT $3`,
      [embeddingStr, companyId, limit, threshold],
    );
  }

  async searchChunksByDocument(documentId: string, embedding: number[], limit = 5, threshold = 0.1) {
    const embeddingStr = `[${embedding.join(',')}]`;
    return this.db.query(
      `SELECT *, 1 - (embedding <=> $1::vector) as similarity
       FROM chunks WHERE document_id = $2
       HAVING 1 - (embedding <=> $1::vector) >= $4
       ORDER BY embedding <=> $1::vector LIMIT $3`,
      [embeddingStr, documentId, limit, threshold],
    );
  }

  // Leads
  async createLead(data: any) {
    const rows = await this.db.query(
      `INSERT INTO leads (id, company_id, conversation_id, name, email, phone, message, source, status, department, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now()) RETURNING *`,
      [data.id, data.companyId, data.conversationId, data.name, data.email, data.phone, data.message, data.source || 'chat', data.status || 'new', data.department],
    );
    return rows[0];
  }

  async findLeadById(id: string) {
    return this.db.queryOne(`SELECT * FROM leads WHERE id = $1`, [id]);
  }

  async findLeadByConversation(conversationId: string) {
    return this.db.queryOne(`SELECT * FROM leads WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`, [conversationId]);
  }

  async findLeadsByCompany(companyId: string) {
    return this.db.query(`SELECT * FROM leads WHERE company_id = $1 ORDER BY created_at DESC`, [companyId]);
  }

  async updateLead(id: string, data: { name?: string; email?: string; phone?: string; department?: string; status?: string }) {
    const sets: string[] = ['updated_at = now()'];
    const params: any[] = [id];
    let i = 2;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) { sets.push(`${k} = $${i++}`); params.push(v); }
    }
    const rows = await this.db.query(`UPDATE leads SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    return rows[0];
  }

  // Appointments
  async createAppointment(data: any) {
    const rows = await this.db.query(
      `INSERT INTO appointments (id, company_id, conversation_id, lead_id, customer_name, customer_email, title, notes, start_time, end_time, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now()) RETURNING *`,
      [data.id, data.companyId, data.conversationId, data.leadId, data.customerName, data.customerEmail, data.title, data.notes, data.startTime, data.endTime, data.status || 'requested'],
    );
    return rows[0];
  }

  async findAppointmentsByCompany(companyId: string) {
    return this.db.query(`SELECT * FROM appointments WHERE company_id = $1 ORDER BY start_time DESC`, [companyId]);
  }

  async findAppointmentById(id: string) {
    return this.db.queryOne(`SELECT * FROM appointments WHERE id = $1`, [id]);
  }

  async updateAppointment(id: string, data: { status?: string }) {
    const rows = await this.db.query(`UPDATE appointments SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`, [id, data.status]);
    return rows[0];
  }

  // Analytics
  async countConversations(companyId: string) {
    const row = await this.db.queryOne(`SELECT count(*)::int as count FROM conversations WHERE company_id = $1`, [companyId]);
    return row?.count || 0;
  }

  async countLeads(companyId: string) {
    const row = await this.db.queryOne(`SELECT count(*)::int as count FROM leads WHERE company_id = $1`, [companyId]);
    return row?.count || 0;
  }

  async countAppointments(companyId: string) {
    const row = await this.db.queryOne(`SELECT count(*)::int as count FROM appointments WHERE company_id = $1`, [companyId]);
    return row?.count || 0;
  }

  // Departments
  async createDepartment(data: { companyId: string; name: string; description?: string; keywords?: string[]; email?: string }) {
    const rows = await this.db.query(
      `INSERT INTO departments (id, company_id, name, description, keywords, email, created_at)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,now()) RETURNING *`,
      [data.companyId, data.name, data.description, JSON.stringify(data.keywords || []), data.email],
    );
    return rows[0];
  }

  async listDepartments(companyId: string) {
    return this.db.query(`SELECT * FROM departments WHERE company_id = $1 ORDER BY name`, [companyId]);
  }

  async deleteDepartment(id: string) {
    await this.db.query(`DELETE FROM departments WHERE id = $1`, [id]);
  }
}
