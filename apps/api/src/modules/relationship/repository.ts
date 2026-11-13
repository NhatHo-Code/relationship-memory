import type { Db } from "../../db.js";

export async function findActiveMembership(db: Db, spaceId: string, userId: string) {
  const [row] = await db`
    select id, space_id, user_id, role, status
    from space_memberships
    where space_id = ${spaceId} and user_id = ${userId} and status = 'active'
  `;
  return row;
}

export async function insertSpace(db: Db, name: string, createdBy: string) {
  const [row] = await db`
    insert into relationship_spaces (name, created_by)
    values (${name}, ${createdBy})
    returning id, name, status, created_at
  `;
  return row!;
}

export async function insertMembership(db: Db, spaceId: string, userId: string, role: string) {
  await db`
    insert into space_memberships (space_id, user_id, role)
    values (${spaceId}, ${userId}, ${role})
  `;
}

export async function listSpacesForUser(db: Db, userId: string) {
  return db`
    select rs.id, rs.name, rs.status, rs.created_at, sm.role
    from relationship_spaces rs
    join space_memberships sm on sm.space_id = rs.id
    where sm.user_id = ${userId} and sm.status = 'active'
    order by rs.created_at desc
  `;
}

export async function listMembers(db: Db, spaceId: string) {
  return db`
    select sm.user_id, sm.role, sm.joined_at, p.display_name
    from space_memberships sm
    join profiles p on p.id = sm.user_id
    where sm.space_id = ${spaceId} and sm.status = 'active'
  `;
}

export async function countActiveMembers(db: Db, spaceId: string): Promise<number> {
  const [row] = await db`
    select count(*)::int as count
    from space_memberships
    where space_id = ${spaceId} and status = 'active'
  `;
  return (row?.count as number) ?? 0;
}

export async function insertInvitation(
  db: Db,
  opts: { spaceId: string; createdBy: string; tokenHash: string; expiresAt: Date },
) {
  const [row] = await db`
    insert into invitations (space_id, created_by, token_hash, expires_at)
    values (${opts.spaceId}, ${opts.createdBy}, ${opts.tokenHash}, ${opts.expiresAt})
    returning id, expires_at
  `;
  return row!;
}
