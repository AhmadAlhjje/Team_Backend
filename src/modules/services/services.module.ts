import { Module } from '@nestjs/common';

import { TechnologiesModule } from '../technologies/technologies.module.js';
import { AdminServicesController, ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

@Module({
  imports: [TechnologiesModule],
  controllers: [ServicesController, AdminServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
