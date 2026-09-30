import { Module } from '@nestjs/common';

import { AdminTeamController, TeamController } from './team.controller.js';
import { TeamService } from './team.service.js';

@Module({
  controllers: [TeamController, AdminTeamController],
  providers: [TeamService],
})
export class TeamModule {}
