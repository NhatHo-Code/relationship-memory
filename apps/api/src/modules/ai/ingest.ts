import { sql } from "../../db.js";
import type { Job } from "../../lib/queue.js";
import { chunkText } from "./chunk.js";
import type { IngestPayload } from "./jobs.js";
import type { LLMProvider } from "./provider.js";

export type IngestResult = "done" | "noop_deleted" | "noop_stale";

export const toVectorLiteral = (v: number[] | undefined) => {
  if (!v) throw new Error("missing embedding");
  return `[${v.join(",")}]`;
};

export function makeIngestProcessor(provider: LLMProvider) {
  return async (job: Job<IngestPayload>): Promise<IngestResult> => {
    const [memory] = await sql`
      select id, space_id, version, title, body
      from memories where id = ${job.payload.memoryId}
    `;
    if (!memory) return "noop_deleted";
    if (memory.version !== job.payload.version) return "noop_stale";

    const chunks = chunkText(`${memory.title as string}\n\n${memory.body as string}`);
    const vectors = await provider.embed(chunks); // outside transaction — no lock held during network call

    return sql.begin(async (tx) => {
      // re-check under lock: memory may have changed while we called the provider
      const [current] = await tx`
        select version from memories where id = ${memory.id} for update
      `;
      if (!current) return "noop_deleted";
      if (current.version !== memory.version) return "noop_stale";

      await tx`delete from memory_chunks where memory_id = ${memory.id}`;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        const vec = toVectorLiteral(vectors[i]);
        await tx`
          insert into memory_chunks
            (memory_id, space_id, chunk_index, content, embedding, embedding_model, memory_version)
          values
            (${memory.id}, ${memory.spaceId}, ${i}, ${chunk},
             ${vec}::extensions.vector, ${provider.embeddingModel}, ${memory.version})
        `;
      }

      await tx`update memories set ai_status = 'ready' where id = ${memory.id}`;
      return "done" as const;
    });
  };
}
