import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { sql } from "../src/db.js";
import { auth, createTestUser } from "./helpers/auth.js";
import { createSpaceAs } from "./helpers/factories.js";
import request from "supertest";

const app = createApp();

afterAll(async () => {
  await sql.end();
});

describe("invitations", () => {
  let alice: { id: string; email: string; token: string };
  let bob: { id: string; email: string; token: string };
  let carol: { id: string; email: string; token: string };

  beforeAll(async () => {
    [alice, bob, carol] = await Promise.all([
      createTestUser("alice-inv"),
      createTestUser("bob-inv"),
      createTestUser("carol-inv"),
    ]);
  });

  describe("POST /v1/spaces/:spaceId/invitations", () => {
    it("owner can create invitation", async () => {
      const space = await createSpaceAs(app, alice);
      const res = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ invitationId: expect.any(String), token: expect.any(String) });
    });

    it("non-member cannot create invitation", async () => {
      const space = await createSpaceAs(app, alice);
      const res = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(bob.token));
      expect(res.status).toBe(404);
    });

    it("partner cannot create invitation", async () => {
      const space = await createSpaceAs(app, alice);
      const inv = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      await request(app)
        .post("/v1/invitations/accept")
        .set(auth(bob.token))
        .send({ token: inv.body.token });
      const res = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(bob.token));
      expect(res.status).toBe(403);
    });

    it("cannot invite when space is full (2 members)", async () => {
      const space = await createSpaceAs(app, alice);
      const inv = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      await request(app)
        .post("/v1/invitations/accept")
        .set(auth(bob.token))
        .send({ token: inv.body.token });
      const res = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("SPACE_FULL");
    });
  });

  describe("POST /v1/invitations/accept", () => {
    it("valid token joins space as partner", async () => {
      const space = await createSpaceAs(app, alice);
      const inv = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      const res = await request(app)
        .post("/v1/invitations/accept")
        .set(auth(bob.token))
        .send({ token: inv.body.token });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ spaceId: space.id, role: "partner" });
    });

    it("invalid token returns 404", async () => {
      const res = await request(app)
        .post("/v1/invitations/accept")
        .set(auth(bob.token))
        .send({ token: "a".repeat(44) });
      expect(res.status).toBe(404);
    });

    it("already member returns 409", async () => {
      const space = await createSpaceAs(app, alice);
      // create both invitations before anyone accepts
      const [inv1, inv2] = await Promise.all([
        request(app).post(`/v1/spaces/${space.id}/invitations`).set(auth(alice.token)),
        request(app).post(`/v1/spaces/${space.id}/invitations`).set(auth(alice.token)),
      ]);
      await request(app)
        .post("/v1/invitations/accept")
        .set(auth(bob.token))
        .send({ token: inv1.body.token });
      // bob tries to accept again with the second token
      const res = await request(app)
        .post("/v1/invitations/accept")
        .set(auth(bob.token))
        .send({ token: inv2.body.token });
      expect(res.status).toBe(409);
    });

    it("race condition: two users accept different invitations concurrently — only one wins", async () => {
      const space = await createSpaceAs(app, alice);
      const [inv1, inv2] = await Promise.all([
        request(app).post(`/v1/spaces/${space.id}/invitations`).set(auth(alice.token)),
        request(app).post(`/v1/spaces/${space.id}/invitations`).set(auth(alice.token)),
      ]);

      const [r1, r2] = await Promise.all([
        request(app)
          .post("/v1/invitations/accept")
          .set(auth(bob.token))
          .send({ token: inv1.body.token }),
        request(app)
          .post("/v1/invitations/accept")
          .set(auth(carol.token))
          .send({ token: inv2.body.token }),
      ]);

      expect([r1.status, r2.status].sort()).toEqual([200, 409]);

      const [{ count }] = await sql<[{ count: number }]>`
        select count(*)::int as count from space_memberships
        where space_id = ${space.id} and status = 'active'
      `;
      expect(count).toBe(2);
    });
  });

  describe("POST /v1/invitations/:invitationId/revoke", () => {
    it("owner can revoke pending invitation", async () => {
      const space = await createSpaceAs(app, alice);
      const inv = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      const res = await request(app)
        .post(`/v1/invitations/${inv.body.invitationId}/revoke`)
        .set(auth(alice.token));
      expect(res.status).toBe(204);
    });

    it("revoked token cannot be accepted", async () => {
      const space = await createSpaceAs(app, alice);
      const inv = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      await request(app)
        .post(`/v1/invitations/${inv.body.invitationId}/revoke`)
        .set(auth(alice.token));
      const res = await request(app)
        .post("/v1/invitations/accept")
        .set(auth(bob.token))
        .send({ token: inv.body.token });
      expect(res.status).toBe(410);
    });

    it("non-owner cannot revoke invitation", async () => {
      const space = await createSpaceAs(app, alice);
      const inv = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      const res = await request(app)
        .post(`/v1/invitations/${inv.body.invitationId}/revoke`)
        .set(auth(bob.token));
      expect(res.status).toBe(404);
    });

    it("cannot revoke already-accepted invitation", async () => {
      const space = await createSpaceAs(app, alice);
      const inv = await request(app)
        .post(`/v1/spaces/${space.id}/invitations`)
        .set(auth(alice.token));
      await request(app)
        .post("/v1/invitations/accept")
        .set(auth(bob.token))
        .send({ token: inv.body.token });
      const res = await request(app)
        .post(`/v1/invitations/${inv.body.invitationId}/revoke`)
        .set(auth(alice.token));
      expect(res.status).toBe(409);
    });

    it("invalid invitationId UUID returns 400", async () => {
      const res = await request(app)
        .post("/v1/invitations/not-a-uuid/revoke")
        .set(auth(alice.token));
      expect(res.status).toBe(400);
    });
  });
});
