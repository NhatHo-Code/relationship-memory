import type { Express } from "express";
import request from "supertest";
import { sql } from "../../src/db.js";
import { auth } from "./auth.js";

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
