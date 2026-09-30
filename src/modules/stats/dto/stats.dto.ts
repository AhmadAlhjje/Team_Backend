export class PublicStatsDto {
  /** Published projects. */
  projects!: number;
  /** Published projects currently in use (phase LIVE). */
  liveProjects!: number;
  teamMembers!: number;
  /** Clients that agreed to be displayed. */
  clients!: number;
  achievements!: number;
  /** Derived from the founding year in settings; null when not set. */
  yearsOfExperience!: number | null;
}
