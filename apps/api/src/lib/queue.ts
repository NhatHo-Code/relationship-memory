import { sql, type Db } from "../db.js";

export interface Job<T> {
  id: string;
  readCount: number;
  payload: T;
}

export interface JobQueue {
  enqueue<T>(db: Db, queue: string, payload: T): Promise<void>;
  read<T>(queue: string, visibilityTimeoutSec: number, batchSize: number): Promise<Job<T>[]>;
  ack(queue: string, jobId: string): Promise<void>;
  retryLater(queue: string, jobId: string, delaySec: number): Promise<void>;
  deadLetter(queue: string, jobId: string): Promise<void>;
}

export const pgmqQueue: JobQueue = {
  async enqueue(db, queue, payload) {
    await db`select pgmq.send(${queue}, ${(db as typeof sql).json(payload as never)})`;
  },
  async read(queue, vt, qty) {
    const rows = await sql`
      select msg_id, read_ct, message from pgmq.read(${queue}, ${vt}, ${qty})
    `;
    return rows.map((r) => ({
      id: String(r.msgId),
      readCount: r.readCt as number,
      payload: r.message as never,
    }));
  },
  async ack(queue, jobId) {
    await sql`select pgmq.delete(${queue}, ${jobId}::bigint)`;
  },
  async retryLater(queue, jobId, delaySec) {
    await sql`select pgmq.set_vt(${queue}, ${jobId}::bigint, ${delaySec})`;
  },
  async deadLetter(queue, jobId) {
    await sql`select pgmq.archive(${queue}, ${jobId}::bigint)`;
  },
};
