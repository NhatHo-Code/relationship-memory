import { createHash, randomBytes } from "node:crypto";
import { sql } from "../../db.js";
import { AppError, forbidden, notFound } from "../../lib/errors.js";
import type { CreateSpaceInput } from "@rm/shared";
import {
  countActiveMembers,
  findActiveMembership,
  insertInvitation,
  insertMembership,
  insertSpace,
  listMembers,
  listSpacesForUser,
} from "./repository.js";

export function generateInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSpace(userId: string, input: CreateSpaceInput) {
  return sql.begin(async (tx) => {
    const space = await insertSpace(tx, input.name, userId);
    await insertMembership(tx, space.id as string, userId, "owner");
    return { ...space, role: "owner" };
  });
}

export async function requireMembership(userId: string, spaceId: string) {
  const m = await findActiveMembership(sql, spaceId, userId);
  if (!m) throw notFound("Space");
  return m;
}

export async function getSpace(userId: string, spaceId: string) {
  const m = await requireMembership(userId, spaceId);
  const [space] = await sql`select id, name, status, created_at from relationship_spaces where id = ${spaceId}`;
  const members = await listMembers(sql, spaceId);
  return { ...space, role: m.role, members };
}

export async function listSpaces(userId: string) {
  return listSpacesForUser(sql, userId);
}

export async function createInvitation(userId: string, spaceId: string) {
  const m = await requireMembership(userId, spaceId);
  if (m.role !== "owner") throw forbidden("Only the owner can invite");
  if ((await countActiveMembers(sql, spaceId)) >= 2) {
    throw new AppError(409, "SPACE_FULL", "Space already has 2 members");
  }
  const { token, tokenHash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inv = await insertInvitation(sql, { spaceId, createdBy: userId, tokenHash, expiresAt });
  return { invitationId: inv.id, token, expiresAt: inv.expiresAt };
}
