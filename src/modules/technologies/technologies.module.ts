import { Module } from '@nestjs/common';

import { TechnologiesController } from './technologies.controller.js';
import { TechnologiesService } from './technologies.service.js';

@Module({
  controllers: [TechnologiesController],
  providers: [TechnologiesService],
  exports: [TechnologiesService],
})
export class TechnologiesModule {}
