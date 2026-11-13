import { sql } from "../../db.js";
import { logger } from "../../logger.js";
import type { Job, JobQueue } from "../../lib/queue.js";
import { INGEST_QUEUE, type IngestPayload } from "./jobs.js";
import type { IngestResult } from "./ingest.js";

export interface WorkerOptions {
  queue: JobQueue;
  processor: (job: Job<IngestPayload>) => Promise<IngestResult>;
  maxAttempts?: number;
  backoffBaseSec?: number;
}

export async function runOnce(opts: WorkerOptions): Promise<number> {
  const { queue, processor, maxAttempts = 3, backoffBaseSec = 5 } = opts;
  const jobs = await queue.read<IngestPayload>(INGEST_QUEUE, 60, 5);

  for (const job of jobs) {
    const memoryId = job.payload.memoryId;
    if (job.readCount > maxAttempts) {
      await sql`
        update memories set ai_status = 'failed'
        where id = ${memoryId} and version = ${job.payload.version}
      `;
      await queue.deadLetter(INGEST_QUEUE, job.id);
      logger.warn({ jobId: job.id, memoryId }, "Job exceeded max attempts, dead-lettered");
      continue;
    }

    try {
      const result = await processor(job);
      await queue.ack(INGEST_QUEUE, job.id);
      logger.info({ jobId: job.id, memoryId, result }, "Job processed");
    } catch (err) {
      const delaySec = backoffBaseSec * 2 ** job.readCount;
      await queue.retryLater(INGEST_QUEUE, job.id, delaySec);
      logger.warn({ jobId: job.id, memoryId, err }, "Job failed, will retry");
    }
  }

  return jobs.length;
}
