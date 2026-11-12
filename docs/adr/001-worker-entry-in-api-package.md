# ADR-001: Worker entry point in apps/api package

**Status:** Accepted

## Context

ADR v1.1 proposed a separate `apps/worker` package for the background job worker.

## Decision

The worker lives as `apps/api/src/worker.ts` — a separate entry point within the same package rather than a separate workspace package.

## Consequences

- Domain code (queue logic, DB access) is shared without an extra package
- One Docker image, two start commands (`node dist/server.js` and `node dist/worker.js`)
- Slight deviation from the original ADR — recorded here as the authoritative decision
