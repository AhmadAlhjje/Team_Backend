import { MessageStatus } from '../../../generated/prisma/enums.js';

export class StatusCountsDto {
  published!: number;
  draft!: number;
  archived!: number;
}

export class RecentMessageDto {
  id!: number;
  name!: string;
  projectType!: string | null;
  status!: MessageStatus;
  createdAt!: Date;
}

export class MessageCountsDto {
  unread!: number;
  total!: number;
}

export class DashboardDto {
  projects!: StatusCountsDto;
  teamMembers!: StatusCountsDto;
  publishedServices!: number;
  publishedAchievements!: number;
  publishedTestimonials!: number;
  publishedClients!: number;
  publishedFaqs!: number;
  /** Null when the user cannot read messages. */
  messages!: MessageCountsDto | null;
  recentMessages!: RecentMessageDto[];
}
