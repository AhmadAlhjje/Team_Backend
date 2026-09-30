import { Module } from '@nestjs/common';

import { TechnologiesModule } from '../technologies/technologies.module.js';
import { AdminProjectsController, ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [TechnologiesModule],
  controllers: [ProjectsController, AdminProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
