import { Module } from '@nestjs/common';

import { AdminContactController, ContactController } from './contact.controller.js';
import { ContactService } from './contact.service.js';

@Module({
  controllers: [ContactController, AdminContactController],
  providers: [ContactService],
})
export class ContactModule {}
