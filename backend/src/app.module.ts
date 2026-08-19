import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './common/database.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { AIModule } from './ai/ai.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { WebsocketModule } from './websocket/websocket.module';
import { LeadsModule } from './leads/leads.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DepartmentsModule } from './departments/departments.module';
import { CompaniesModule } from './companies/companies.module';
import { WidgetModule } from './widget/widget.module';
import { AnalyticsController } from './analytics/analytics.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 120 },
      { name: 'strict', ttl: 60000, limit: 10 },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    DatabaseModule,
    AuthModule,
    ChatModule,
    AIModule,
    KnowledgeBaseModule,
    WebsocketModule,
    LeadsModule,
    AppointmentsModule,
    DepartmentsModule,
    CompaniesModule,
    WidgetModule,
  ],
  controllers: [AnalyticsController, HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}