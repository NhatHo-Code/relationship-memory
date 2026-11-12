# Relationship Memory

A shared memory app for couples — store, search and revisit meaningful moments together.

## Tech stack

- **Runtime:** Node.js (LTS) + TypeScript strict
- **API:** Express 5, Zod 4, postgres.js
- **DB:** Supabase (PostgreSQL + pgvector)
- **Monorepo:** pnpm workspaces
- **Testing:** Vitest + Supertest
- **CI:** GitHub Actions

## Data model

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "1-1"
  PROFILES ||--o{ SPACE_MEMBERSHIPS : has
  RELATIONSHIP_SPACES ||--o{ SPACE_MEMBERSHIPS : "max 2 active"
  RELATIONSHIP_SPACES ||--o{ INVITATIONS : has
  RELATIONSHIP_SPACES ||--o{ MEMORIES : contains
  PROFILES ||--o{ MEMORIES : creates
  MEMORIES ||--o{ PREFERENCE_FACTS : "source of"
  MEMORIES ||--o{ MEMORY_CHUNKS : "embedded as"
```

## How to run

**Requirements:** Node LTS, pnpm, Docker Desktop, Supabase CLI

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev:api
```

```bash
pnpm test
```
