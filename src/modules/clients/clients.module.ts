import { Module } from '@nestjs/common';

import { AdminClientsController, ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  controllers: [ClientsController, AdminClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
