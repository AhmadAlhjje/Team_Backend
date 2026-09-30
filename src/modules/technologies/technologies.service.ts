import { Injectable } from '@nestjs/common';

import { slugify, uniqueNames } from '../../common/utils/content.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { createHash } from 'node:crypto';

export interface TechnologyDto {
  id: number;
  name: string;
  slug: string;
}

@Injectable()
export class TechnologiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<TechnologyDto[]> {
    return this.prisma.technology.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  }

  /**
   * Resolves technology names typed in Admin to IDs, creating missing ones.
   * Keeps the input order and ignores duplicates (case-insensitive).
   */
  async resolveIds(tx: Prisma.TransactionClient, names: string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const name of uniqueNames(names)) {
      const slug = slugify(name) || `tech-${createHash('sha1').update(name).digest('hex').slice(0, 10)}`;
      const technology = await tx.technology.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
        select: { id: true },
      });
      if (!ids.includes(technology.id)) ids.push(technology.id);
    }
    return ids;
  }
}
