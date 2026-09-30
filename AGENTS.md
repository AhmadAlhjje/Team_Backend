# Agent instructions

**Read [ROLE.md](./ROLE.md) before changing anything in this project.** It defines the architecture, conventions and rules; follow it over general habits. Documentation lives in [docs/](./docs).

- NestJS 12 is ESM: relative imports end with `.js`.
- Prisma 7: the client is generated into `src/generated/prisma` (`npm run db:generate`); the datasource URL lives in `prisma.config.ts`.
- Verify changes with `npm run typecheck && npm run lint && npm test` (and `npm run test:e2e` when a database is available).
