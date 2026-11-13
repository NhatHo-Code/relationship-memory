import type { Db } from "../../db.js";

// Single source of truth for "who can see a memory" (BR-03, BR-04).
// Every read query on memories must include it.
export const visibleTo = (db: Db, userId: string) =>
  db`(m.visibility = 'shared' or m.creator_id = ${userId})`;

const memoryColumns = (db: Db) => db`
  m.id, m.space_id, m.creator_id, m.title, m.body,
  m.event_date::text as event_date, m.date_precision, m.visibility, m.tags,
  m.ai_status, m.version, m.created_at, m.updated_at
`;

export interface Cursor {
  eventDate: string;
  id: string;
}

export async function findVisibleMemory(db: Db, userId: string, memoryId: string) {
  const [row] = await db`
    select ${memoryColumns(db)}
    from memories m
    join space_memberships sm
      on sm.space_id = m.space_id and sm.user_id = ${userId} and sm.status = 'active'
    where m.id = ${memoryId} and ${visibleTo(db, userId)}
  `;
  return row as Record<string, unknown> | undefined;
}

export async function listVisibleMemories(
  db: Db,
  opts: { userId: string; spaceId: string; limit: number; cursor?: Cursor },
) {
  const { userId, spaceId, limit, cursor } = opts;
  const cursorClause = cursor
    ? db`and (m.event_date, m.id) < (${cursor.eventDate}::date, ${cursor.id}::uuid)`
    : db``;
  const rows = await db`
    select ${memoryColumns(db)}
    from memories m
    join space_memberships sm
      on sm.space_id = m.space_id and sm.user_id = ${userId} and sm.status = 'active'
    where m.space_id = ${spaceId}
      and ${visibleTo(db, userId)}
      ${cursorClause}
    order by m.event_date desc, m.id desc
    limit ${limit + 1}
  `;
  return rows as Record<string, unknown>[];
}

const activeMemberOf = (db: Db, userId: string) => db`
  exists (
    select 1 from space_memberships sm
    where sm.space_id = m.space_id and sm.user_id = ${userId} and sm.status = 'active'
  )
`;

export async function updateOwnMemory(
  db: Db,
  userId: string,
  memoryId: string,
  expectedVersion: number,
  patch: Record<string, unknown>,
) {
  const [row] = await db`
    update memories m
    set ${db(patch)}, version = m.version + 1, updated_at = now()
    where m.id = ${memoryId}
      and m.creator_id = ${userId}
      and m.version = ${expectedVersion}
      and ${activeMemberOf(db, userId)}
    returning ${memoryColumns(db)}
  `;
  return row as Record<string, unknown> | undefined;
}

export async function deleteOwnMemory(db: Db, userId: string, memoryId: string) {
  const [row] = await db`
    delete from memories m
    where m.id = ${memoryId}
      and m.creator_id = ${userId}
      and ${activeMemberOf(db, userId)}
    returning m.id
  `;
  return row as { id: string } | undefined;
}

export async function insertMemory(
  db: Db,
  data: {
    spaceId: string;
    creatorId: string;
    title: string;
    body: string;
    eventDate: string;
    datePrecision: string;
    visibility: string;
    tags: string[];
  },
) {
  const [row] = await db`
    insert into memories
      (space_id, creator_id, title, body, event_date, date_precision, visibility, tags)
    values
      (${data.spaceId}, ${data.creatorId}, ${data.title}, ${data.body},
       ${data.eventDate}::date, ${data.datePrecision}, ${data.visibility}, ${data.tags})
    returning
      id, space_id, creator_id, title, body,
      event_date::text as event_date, date_precision, visibility, tags,
      ai_status, version, created_at, updated_at
  `;
  return row as Record<string, unknown>;
}
