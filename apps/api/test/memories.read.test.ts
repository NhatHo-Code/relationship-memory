import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { sql } from "../src/db.js";
import { auth } from "./helpers/auth.js";
import { createCoupleSpace, createMemoryAs } from "./helpers/factories.js";
import request from "supertest";
import type { MemoryDto } from "@rm/shared";

const app = createApp();

afterAll(async () => {
  await sql.end();
});

describe("memories - read", () => {
  let ctx: Awaited<ReturnType<typeof createCoupleSpace>>;

  beforeAll(async () => {
    ctx = await createCoupleSpace(app);
  });

  it("member creates memory → 201, creatorId === caller, aiStatus === pending", async () => {
    const res = await request(app)
      .post(`/v1/spaces/${ctx.spaceId}/memories`)
      .set(auth(ctx.alice.token))
      .send({
        title: "Our first trip",
        body: "We went to Da Lat",
        eventDate: "2024-01-10",
        datePrecision: "day",
        visibility: "shared",
        tags: ["travel"],
      });
    expect(res.status).toBe(201);
    expect(res.body.creatorId).toBe(ctx.alice.id);
    expect(res.body.aiStatus).toBe("pending");
  });

  it("creatorId in body is ignored — uses token identity", async () => {
    const res = await request(app)
      .post(`/v1/spaces/${ctx.spaceId}/memories`)
      .set(auth(ctx.alice.token))
      .send({
        title: "Title",
        body: "",
        eventDate: "2024-02-01",
        datePrecision: "day",
        visibility: "shared",
        tags: [],
        creatorId: ctx.bob.id,
      });
    expect(res.status).toBe(201);
    expect(res.body.creatorId).toBe(ctx.alice.id);
  });

  it("missing visibility → 400", async () => {
    const res = await request(app)
      .post(`/v1/spaces/${ctx.spaceId}/memories`)
      .set(auth(ctx.alice.token))
      .send({ title: "Title", eventDate: "2024-02-01" });
    expect(res.status).toBe(400);
  });

  it("Bob GET private memory of Alice → 404 (IDOR blocked)", async () => {
    const mem = await createMemoryAs(app, ctx.alice, ctx.spaceId, { visibility: "private" });
    const res = await request(app)
      .get(`/v1/memories/${mem.id}`)
      .set(auth(ctx.bob.token));
    expect(res.status).toBe(404);
  });

  it("list for Bob excludes Alice private, includes Bob private", async () => {
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

  it("Carol (outsider) GET shared memory of Alice → 404", async () => {
    const mem = await createMemoryAs(app, ctx.alice, ctx.spaceId, { visibility: "shared" });
    const res = await request(app)
      .get(`/v1/memories/${mem.id}`)
      .set(auth(ctx.carol.token));
    expect(res.status).toBe(404);
  });

  it("Carol list space of Alice → 404", async () => {
    const res = await request(app)
      .get(`/v1/spaces/${ctx.spaceId}/memories`)
      .set(auth(ctx.carol.token));
    expect(res.status).toBe(404);
  });

  it("Carol create memory in Alice space → 404", async () => {
    const res = await request(app)
      .post(`/v1/spaces/${ctx.spaceId}/memories`)
      .set(auth(ctx.carol.token))
      .send({ title: "X", eventDate: "2024-01-01", visibility: "shared" });
    expect(res.status).toBe(404);
  });

  it("cursor pagination: 25 memories → pages of 10, 10, 5; no duplicates; desc order", async () => {
    // create a fresh couple space to have clean pagination
    const freshCtx = await createCoupleSpace(app);
    const dates = [
      "2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05",
      "2024-01-06", "2024-01-06", "2024-01-06", "2024-01-07", "2024-01-08",
      "2024-01-09", "2024-01-10", "2024-01-11", "2024-01-12", "2024-01-13",
      "2024-01-14", "2024-01-15", "2024-01-16", "2024-01-17", "2024-01-18",
      "2024-01-19", "2024-01-20", "2024-01-21", "2024-01-22", "2024-01-23",
    ];
    await Promise.all(
      dates.map((eventDate, i) =>
        createMemoryAs(app, freshCtx.alice, freshCtx.spaceId, {
          title: `Memory ${i}`,
          eventDate,
          visibility: "shared",
        }),
      ),
    );

    const allIds: string[] = [];
    const pageSizes: number[] = [];
    let nextCursor: string | null = null;

    for (let page = 0; page < 3; page++) {
      const qs: string = nextCursor ? `&cursor=${nextCursor}` : "";
      const res = await request(app)
        .get(`/v1/spaces/${freshCtx.spaceId}/memories?limit=10${qs}`)
        .set(auth(freshCtx.alice.token));
      expect(res.status).toBe(200);
      const items: MemoryDto[] = res.body.items as MemoryDto[];
      pageSizes.push(items.length);
      allIds.push(...items.map((m) => m.id));
      nextCursor = res.body.nextCursor as string | null;
    }

    expect(pageSizes).toEqual([10, 10, 5]);
    expect(nextCursor).toBeNull();
    expect(new Set(allIds).size).toBe(25);

    // verify descending order
    for (let i = 1; i < allIds.length; i++) {
      const prev = allIds[i - 1]!;
      const curr = allIds[i]!;
      const prevIdx = allIds.indexOf(prev);
      const currIdx = allIds.indexOf(curr);
      expect(prevIdx).toBeLessThan(currIdx);
    }
  });

  it("invalid cursor → 400 INVALID_CURSOR", async () => {
    const res = await request(app)
      .get(`/v1/spaces/${ctx.spaceId}/memories?cursor=abc`)
      .set(auth(ctx.alice.token));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_CURSOR");
  });

  it("limit=1000 → 400", async () => {
    const res = await request(app)
      .get(`/v1/spaces/${ctx.spaceId}/memories?limit=1000`)
      .set(auth(ctx.alice.token));
    expect(res.status).toBe(400);
  });

  it("non-existent memoryId → 404 (same as private — attacker cannot distinguish)", async () => {
    const res = await request(app)
      .get(`/v1/memories/${crypto.randomUUID()}`)
      .set(auth(ctx.alice.token));
    expect(res.status).toBe(404);
  });
});
