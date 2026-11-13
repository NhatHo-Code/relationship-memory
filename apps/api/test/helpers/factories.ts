import type { Express } from "express";
import request from "supertest";
import { sql } from "../../src/db.js";
import type { MemoryDto } from "@rm/shared";
import { auth, createTestUser } from "./auth.js";

export async function createSpaceAs(app: Express, user: { token: string }) {
  const res = await request(app)
    .post("/v1/spaces")
    .set(auth(user.token))
    .send({ name: "Test Space" });
  if (res.status !== 201) throw new Error(`createSpaceAs failed: ${JSON.stringify(res.body)}`);
  return res.body as { id: string; name: string; role: string };
}

export async function addMemberDirectly(spaceId: string, userId: string, role: string) {
  await sql`
    insert into space_memberships (space_id, user_id, role)
    values (${spaceId}, ${userId}, ${role})
  `;
}

export async function createMemoryAs(
  app: Express,
  user: { token: string },
  spaceId: string,
  overrides: Partial<{
    title: string;
    body: string;
    eventDate: string;
    datePrecision: string;
    visibility: string;
    tags: string[];
  }> = {},
) {
  const res = await request(app)
    .post(`/v1/spaces/${spaceId}/memories`)
    .set(auth(user.token))
    .send({
      title: "Test memory",
      body: "Some content",
      eventDate: "2024-06-15",
      datePrecision: "day",
      visibility: "shared",
      tags: [],
      ...overrides,
    });
  if (res.status !== 201) throw new Error(`createMemoryAs failed: ${JSON.stringify(res.body)}`);
  return res.body as MemoryDto;
}

export async function createCoupleSpace(app: Express) {
  const [alice, bob, carol] = await Promise.all([
    createTestUser("alice-couple"),
    createTestUser("bob-couple"),
    createTestUser("carol-couple"),
  ]);
  const space = await createSpaceAs(app, alice);
  const inv = await request(app)
    .post(`/v1/spaces/${space.id}/invitations`)
    .set(auth(alice.token));
  await request(app)
    .post("/v1/invitations/accept")
    .set(auth(bob.token))
    .send({ token: inv.body.token });
  return { alice, bob, carol, spaceId: space.id };
}
