import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { sql } from "../src/db.js";
import { hashToken } from "../src/modules/relationship/service.js";
import { auth, createTestUser } from "./helpers/auth.js";
import { addMemberDirectly, createSpaceAs } from "./helpers/factories.js";

const app = createApp();

afterAll(() => sql.end());

describe("POST /v1/spaces", () => {
  it("creates a space and returns role owner", async () => {
    const user = await createTestUser("Owner");
    const res = await request(app)
      .post("/v1/spaces")
      .set(auth(user.token))
      .send({ name: "Our Space" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("owner");
    expect(res.body.name).toBe("Our Space");
  });

  it("returns 400 for empty name", async () => {
    const user = await createTestUser("Owner2");
    const res = await request(app)
      .post("/v1/spaces")
      .set(auth(user.token))
      .send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/v1/spaces").send({ name: "Test" });
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/spaces", () => {
  it("does not return spaces from other users", async () => {
    const alice = await createTestUser("Alice");
    const carol = await createTestUser("Carol");
    await createSpaceAs(app, alice);
    const carolSpace = await createSpaceAs(app, carol);

    const res = await request(app).get("/v1/spaces").set(auth(alice.token));
    expect(res.status).toBe(200);
    const ids = (res.body as { id: string }[]).map((s) => s.id);
    expect(ids).not.toContain(carolSpace.id);
  });
});

describe("GET /v1/spaces/:spaceId", () => {
  it("returns 404 when user is not a member", async () => {
    const alice = await createTestUser("Alice2");
    const carol = await createTestUser("Carol2");
    const carolSpace = await createSpaceAs(app, carol);

    const res = await request(app)
      .get(`/v1/spaces/${carolSpace.id}`)
      .set(auth(alice.token));
    expect(res.status).toBe(404);
  });

  it("returns 400 for non-uuid spaceId", async () => {
    const user = await createTestUser("User");
    const res = await request(app)
      .get("/v1/spaces/not-a-uuid")
      .set(auth(user.token));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /v1/spaces/:spaceId/invitations", () => {
  it("owner creates invitation and token is returned once", async () => {
    const owner = await createTestUser("InvOwner");
    const space = await createSpaceAs(app, owner);

    const res = await request(app)
      .post(`/v1/spaces/${space.id}/invitations`)
      .set(auth(owner.token));
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.invitationId).toBeDefined();
  });

  it("stores token_hash in DB, not raw token", async () => {
    const owner = await createTestUser("InvOwner2");
    const space = await createSpaceAs(app, owner);

    const res = await request(app)
      .post(`/v1/spaces/${space.id}/invitations`)
      .set(auth(owner.token));
    expect(res.status).toBe(201);

    const { token, invitationId } = res.body as { token: string; invitationId: string };
    const [inv] = await sql`select token_hash from invitations where id = ${invitationId}`;
    expect(inv?.tokenHash).toBe(hashToken(token));
    expect(inv?.tokenHash).not.toBe(token);
  });

  it("partner cannot create invitation (403)", async () => {
    const owner = await createTestUser("InvOwner3");
    const partner = await createTestUser("Partner");
    const space = await createSpaceAs(app, owner);
    await addMemberDirectly(space.id, partner.id, "partner");

    const res = await request(app)
      .post(`/v1/spaces/${space.id}/invitations`)
      .set(auth(partner.token));
    expect(res.status).toBe(403);
  });

  it("returns 409 when space already has 2 members", async () => {
    const owner = await createTestUser("InvOwner4");
    const partner = await createTestUser("Partner2");
    const space = await createSpaceAs(app, owner);
    await addMemberDirectly(space.id, partner.id, "partner");

    const res = await request(app)
      .post(`/v1/spaces/${space.id}/invitations`)
      .set(auth(owner.token));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SPACE_FULL");
  });
});
