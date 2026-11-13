import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { sql } from "../src/db.js";
import { auth, createTestUser } from "./helpers/auth.js";
import { createCoupleSpace, createMemoryAs } from "./helpers/factories.js";
import request, { type Test } from "supertest";
import type { MemoryDto, Visibility } from "@rm/shared";

const app = createApp();

afterAll(async () => {
  await sql.end();
});

type Actor = "creator" | "partner" | "outsider" | "anon";
type Op = "get" | "patch" | "delete";

const cases: Array<[Op, Actor, Visibility, number]> = [
  // GET
  ["get", "creator", "shared", 200],
  ["get", "creator", "private", 200],
  ["get", "partner", "shared", 200],
  ["get", "partner", "private", 404],
  ["get", "outsider", "shared", 404],
  ["get", "outsider", "private", 404],
  ["get", "anon", "shared", 401],
  ["get", "anon", "private", 401],
  // PATCH
  ["patch", "creator", "shared", 200],
  ["patch", "creator", "private", 200],
  ["patch", "partner", "shared", 403],
  ["patch", "partner", "private", 404],
  ["patch", "outsider", "shared", 404],
  ["patch", "outsider", "private", 404],
  ["patch", "anon", "shared", 401],
  ["patch", "anon", "private", 401],
  // DELETE
  ["delete", "creator", "shared", 204],
  ["delete", "creator", "private", 204],
  ["delete", "partner", "shared", 403],
  ["delete", "partner", "private", 404],
  ["delete", "outsider", "shared", 404],
  ["delete", "outsider", "private", 404],
  ["delete", "anon", "shared", 401],
  ["delete", "anon", "private", 401],
];

describe("memory authorization matrix", () => {
  let ctx: Awaited<ReturnType<typeof createCoupleSpace>>;

  beforeAll(async () => {
    ctx = await createCoupleSpace(app);
  });

  it.each(cases)("%s by %s on %s memory -> %i", async (op, actor, visibility, expected) => {
    const memory = await createMemoryAs(app, ctx.alice, ctx.spaceId, { visibility });
    const tokenMap: Record<Actor, string | undefined> = {
      creator: ctx.alice.token,
      partner: ctx.bob.token,
      outsider: ctx.carol.token,
      anon: undefined,
    };
    const token = tokenMap[actor];

    let req: Test;
    if (op === "get") {
      req = request(app).get(`/v1/memories/${memory.id}`);
    } else if (op === "patch") {
      req = request(app)
        .patch(`/v1/memories/${memory.id}`)
        .send({ version: memory.version, title: "edited" });
    } else {
      req = request(app).delete(`/v1/memories/${memory.id}`);
    }

    if (token) req = req.set(auth(token));
    const res = await req;
    expect(res.status).toBe(expected);
  });

  it("list for Bob excludes Alice private, includes his own private", async () => {
    const alicePrivate = await createMemoryAs(app, ctx.alice, ctx.spaceId, {
      visibility: "private",
      title: "Alice private",
    });
    const bobPrivate = await createMemoryAs(app, ctx.bob, ctx.spaceId, {
      visibility: "private",
      title: "Bob private",
    });
    const res = await request(app)
      .get(`/v1/spaces/${ctx.spaceId}/memories`)
      .set(auth(ctx.bob.token));
    expect(res.status).toBe(200);
    const ids = (res.body.items as MemoryDto[]).map((m) => m.id);
    expect(ids).not.toContain(alicePrivate.id);
    expect(ids).toContain(bobPrivate.id);
  });

  it("optimistic lock: second PATCH with old version → 409 VERSION_CONFLICT", async () => {
    const mem = await createMemoryAs(app, ctx.alice, ctx.spaceId, { visibility: "shared" });

    const r1 = await request(app)
      .patch(`/v1/memories/${mem.id}`)
      .set(auth(ctx.alice.token))
      .send({ version: mem.version, title: "First edit" });
    expect(r1.status).toBe(200);
    expect(r1.body.version).toBe(mem.version + 1);

    const r2 = await request(app)
      .patch(`/v1/memories/${mem.id}`)
      .set(auth(ctx.alice.token))
      .send({ version: mem.version, title: "Stale edit" });
    expect(r2.status).toBe(409);
    expect(r2.body.code).toBe("VERSION_CONFLICT");
    expect(r2.body.details?.currentVersion).toBe(mem.version + 1);

    const check = await request(app)
      .get(`/v1/memories/${mem.id}`)
      .set(auth(ctx.alice.token));
    expect(check.body.title).toBe("First edit");
  });

  it("changing visibility shared→private: partner immediately gets 404", async () => {
    const mem = await createMemoryAs(app, ctx.alice, ctx.spaceId, { visibility: "shared" });

    const beforeRes = await request(app)
      .get(`/v1/memories/${mem.id}`)
      .set(auth(ctx.bob.token));
    expect(beforeRes.status).toBe(200);

    await request(app)
      .patch(`/v1/memories/${mem.id}`)
      .set(auth(ctx.alice.token))
      .send({ version: mem.version, visibility: "private" });

    const afterRes = await request(app)
      .get(`/v1/memories/${mem.id}`)
      .set(auth(ctx.bob.token));
    expect(afterRes.status).toBe(404);
  });

  it("PATCH only title does not clear body", async () => {
    const mem = await createMemoryAs(app, ctx.alice, ctx.spaceId, {
      visibility: "shared",
      body: "Original body content",
    });
    const res = await request(app)
      .patch(`/v1/memories/${mem.id}`)
      .set(auth(ctx.alice.token))
      .send({ version: mem.version, title: "New title" });
    expect(res.status).toBe(200);
    expect(res.body.body).toBe("Original body content");
    expect(res.body.title).toBe("New title");
  });
});
