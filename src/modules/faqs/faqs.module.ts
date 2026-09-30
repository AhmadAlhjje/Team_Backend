import { Module } from '@nestjs/common';

import { AdminFaqsController, FaqsController } from './faqs.controller.js';
import { FaqsService } from './faqs.service.js';

@Module({
  controllers: [FaqsController, AdminFaqsController],
  providers: [FaqsService],
})
export class FaqsModule {}
