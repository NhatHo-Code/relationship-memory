import { sql } from "../../db.js";
import type { Job } from "../../lib/queue.js";
import type { IngestPayload } from "./jobs.js";

export type IngestResult = "done" | "noop_deleted" | "noop_stale";

export async function processIngestJob(job: Job<IngestPayload>): Promise<IngestResult> {
  const [memory] = await sql`
    select id, version, title, body from memories where id = ${job.payload.memoryId}
  `;
  if (!memory) return "noop_deleted";
  if (memory.version !== job.payload.version) return "noop_stale";

  // Day 11: embed and write chunks here

  await sql`
    update memories set ai_status = 'ready'
    where id = ${memory.id} and version = ${memory.version}
  `;
  return "done";
}
