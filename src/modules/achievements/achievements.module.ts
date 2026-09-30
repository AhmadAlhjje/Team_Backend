import { Module } from '@nestjs/common';

import { AchievementsController, AdminAchievementsController } from './achievements.controller.js';
import { AchievementsService } from './achievements.service.js';

@Module({
  controllers: [AchievementsController, AdminAchievementsController],
  providers: [AchievementsService],
})
export class AchievementsModule {}
