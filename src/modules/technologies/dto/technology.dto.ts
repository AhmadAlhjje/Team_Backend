import type { TechnologyDto } from '../technologies.service.js';

export class TechnologyResponseDto implements TechnologyDto {
  id!: number;
  name!: string;
  slug!: string;
}
