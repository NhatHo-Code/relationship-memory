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

export async function acceptInvitation(userId: string, token: string) {
  const tokenHash = hashToken(token);

  return sql.begin(async (tx) => {
    // lock the invitation: two users racing on the SAME token serialize here
    const [inv] = await tx`
      select id, space_id, status, expires_at
      from invitations where token_hash = ${tokenHash}
      for update
    `;
    if (!inv) throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
    if (inv.status !== "pending") {
      throw new AppError(410, "INVITATION_INVALID", "Invitation is no longer valid");
    }
    if (inv.expiresAt <= new Date()) {
      throw new AppError(410, "INVITATION_EXPIRED", "Invitation has expired");
    }

    // lock the space: racing on DIFFERENT invitations of one space serialize here
    await tx`select id from relationship_spaces where id = ${inv.spaceId} for update`;

    const existing = await findActiveMembership(tx, inv.spaceId as string, userId);
    if (existing) throw new AppError(409, "ALREADY_MEMBER", "You are already a member of this space");

    if ((await countActiveMembers(tx, inv.spaceId as string)) >= 2) {
      throw new AppError(409, "SPACE_FULL", "Space already has 2 members");
    }

    await insertMembership(tx, inv.spaceId as string, userId, "partner");
    await tx`
      update invitations
      set status = 'accepted', accepted_by = ${userId}, accepted_at = now()
      where id = ${inv.id}
    `;
    return { spaceId: inv.spaceId as string, role: "partner" as const };
  });
}

export async function revokeInvitation(userId: string, invitationId: string) {
  const [inv] = await sql`select id, space_id, status from invitations where id = ${invitationId}`;
  if (!inv) throw notFound("Invitation");
  const m = await requireMembership(userId, inv.spaceId as string);
  if (m.role !== "owner") throw forbidden("Only the owner can revoke invitations");
  if (inv.status !== "pending") {
    throw new AppError(409, "INVITATION_INVALID", "Only pending invitations can be revoked");
  }
  await sql`update invitations set status = 'revoked' where id = ${invitationId}`;
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
