import { Injectable, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected database pool error', err);
    });
  }

  async query<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<T[]> {
    const result: QueryResult<T> = await this.pool.query(text, params);
    return result.rows;
  }

  async queryOne<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] || null;
  }

  async getClient() {
    return this.pool.connect();
  }
}
