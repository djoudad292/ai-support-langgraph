import { Module } from '@nestjs/common';
import { WidgetController } from './widget.controller';
import { DatabaseModule } from '../common/database.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, AIModule],
  controllers: [WidgetController],
})
export class WidgetModule {}