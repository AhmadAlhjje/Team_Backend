import { Module } from '@nestjs/common';

import { AdminTestimonialsController, TestimonialsController } from './testimonials.controller.js';
import { TestimonialsService } from './testimonials.service.js';

@Module({
  controllers: [TestimonialsController, AdminTestimonialsController],
  providers: [TestimonialsService],
})
export class TestimonialsModule {}
