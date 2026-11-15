import { sql } from "../../db.js";
import { visibleTo } from "../memory/repository.js";
import { toVectorLiteral } from "./ingest.js";

export const TOP_K = 5;
export const MAX_DISTANCE = 0.6;

export async function retrieveVisibleChunks(
  userId: string,
  spaceId: string,
  queryVector: number[],
) {
  const vec = toVectorLiteral(queryVector);
  const rows = await sql`
    select c.memory_id, c.content, m.title, m.event_date::text as event_date,
           c.embedding <=> ${vec}::extensions.vector as distance
    from memory_chunks c
    join memories m on m.id = c.memory_id
    where c.space_id = ${spaceId}
      and m.space_id = ${spaceId}
      and ${visibleTo(sql, userId)}
    order by c.embedding <=> ${vec}::extensions.vector
    limit ${TOP_K}
  `;
  return rows.filter((r) => Number(r.distance) <= MAX_DISTANCE) as {
    memoryId: string;
    content: string;
    title: string;
    eventDate: string;
    distance: string;
  }[];
}
