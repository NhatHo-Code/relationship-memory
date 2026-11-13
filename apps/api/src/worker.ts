import { sql } from "./db.js";
import { logger } from "./logger.js";
import { pgmqQueue } from "./lib/queue.js";
import { processIngestJob } from "./modules/ai/ingest.js";
import { runOnce } from "./modules/ai/worker-loop.js";

let running = true;
const stop = () => {
  logger.info("Worker stopping after current batch");
  running = false;
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

logger.info("Worker started");

while (running) {
  const handled = await runOnce({ queue: pgmqQueue, processor: processIngestJob });
  if (handled === 0) await sleep(1000);
}

await sql.end();
logger.info("Worker stopped");
