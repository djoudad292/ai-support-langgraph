import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as PinoLogger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/exception.filter';
import { DatabaseService } from './common/database.service';
import { StoreService } from './common/store.service';
import { AIService } from './ai/ai.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  const logger = new Logger('Bootstrap');

  // Serve the embeddable chat widget
  const publicDir = join(__dirname, '..', 'public');
  if (existsSync(publicDir)) {
    app.useStaticAssets(publicDir, { index: false });
    logger.log(`Serving static assets from ${publicDir}`);
  } else {
    logger.warn(`public dir not found at ${publicDir}`);
  }

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: false,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('AI Customer Support API')
    .setDescription('The AI Customer Support SaaS Platform API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const db = app.get(DatabaseService);
  const store = app.get(StoreService);
  const ai = app.get(AIService);

  // Set up LangGraph checkpointer tables for conversation memory persistence
  try {
    const { PostgresSaver } = await import('@langchain/langgraph-checkpoint-postgres');
    const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL || '');
    await checkpointer.setup();
    logger.log('LangGraph PostgresSaver checkpointer tables created/verified');
  } catch (err) {
    logger.warn(`LangGraph checkpointer setup skipped: ${(err as Error).message}`);
  }

  // Ensure the database schema exists
  try {
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'viewer',
        company_id TEXT NOT NULL,
        token_version INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        settings JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        metadata JSONB NOT NULL DEFAULT '{}',
        lead_id TEXT,
        department TEXT,
        handled_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT,
        sender_type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        chunks TEXT[] NOT NULL DEFAULT '{}',
        filename TEXT,
        mime TEXT,
        size_bytes BIGINT NOT NULL DEFAULT 0,
        page_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ready',
        published BOOLEAN NOT NULL DEFAULT false,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS chunks_company_id_idx ON chunks (company_id);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks (document_id);
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        conversation_id TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        source TEXT NOT NULL DEFAULT 'chat',
        status TEXT NOT NULL DEFAULT 'new',
        department TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        conversation_id TEXT,
        lead_id TEXT,
        customer_name TEXT,
        customer_email TEXT,
        title TEXT NOT NULL,
        notes TEXT,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'requested',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        keywords JSONB NOT NULL DEFAULT '[]',
        email TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    logger.log('Database schema created/verified');
  } catch (err) {
    logger.error(`Schema creation failed: ${(err as Error).message}`);
  }

  // Seed preview/public companies and default data
  try {
    for (const id of ['preview', 'public']) {
      await store.findCompanyById(id) ||
      (await store.createCompany({
        id,
        name: id === 'preview' ? 'Preview' : 'Public',
        slug: id,
        plan: 'free',
        settings: {},
      }));

      const existing = await store.findDocumentsByCompany(id);
      if (existing.length === 0) {
        const content =
          'We are a demo AI virtual receptionist platform. Business hours: 9am-5pm EST Monday-Friday. Contact: support@demo.com or call 1-800-DEMO. We help businesses answer customer questions automatically, capture leads, book appointments, and route conversations to the right department 24/7.';
        try {
          const doc = await store.createDocument({
            id: crypto.randomUUID(),
            companyId: id,
            title: 'Company Info',
            content,
            chunks: [content],
            filename: null,
            mime: null,
            sizeBytes: 0,
            pageCount: 0,
            status: 'ready',
            published: true,
            error: null,
          });
          const embedding = await ai.generateEmbedding(content);
          await store.insertChunk({
            id: crypto.randomUUID(),
            documentId: doc.id,
            companyId: id,
            chunkIndex: 0,
            chunkText: content,
            embedding,
          });
        } catch (e) {
          logger.warn(`Seed embedding skipped: ${(e as Error).message}`);
        }
      }

      const departments = await store.listDepartments(id);
      if (departments.length === 0) {
        await store.createDepartment({
          companyId: id,
          name: 'Sales',
          description: 'Pricing, quotes and purchasing',
          keywords: ['price', 'pricing', 'buy', 'purchase', 'quote', 'cost', 'order', 'sales'],
        });
        await store.createDepartment({
          companyId: id,
          name: 'Support',
          description: 'Technical help and troubleshooting',
          keywords: ['help', 'issue', 'problem', 'error', 'broken', 'not working', 'fix', 'support'],
        });
        await store.createDepartment({
          companyId: id,
          name: 'Billing',
          description: 'Invoices, payments and refunds',
          keywords: ['bill', 'invoice', 'payment', 'refund', 'charge', 'card', 'receipt', 'billing'],
        });
      }
    }
  } catch (e) {
    logger.warn(`Data seeding skipped: ${(e as Error).message}`);
  }

  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port);
  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`📖 Swagger docs: http://localhost:${port}/api`);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});