import { Router } from "express";
import { z } from "zod";
import { acceptInvitationSchema, createSpaceSchema, spaceIdParamsSchema } from "@rm/shared";
import { parse } from "../../lib/parse.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import {
  acceptInvitation,
  createInvitation,
  createSpace,
  getSpace,
  listSpaces,
  revokeInvitation,
} from "./service.js";

export const relationshipRouter = Router();
relationshipRouter.use(requireAuth);

relationshipRouter.post("/spaces", async (req, res) => {
  const user = currentUser(req);
  const input = parse(createSpaceSchema, req.body);
  const space = await createSpace(user.id, input);
  res.status(201).json(space);
});

relationshipRouter.get("/spaces", async (req, res) => {
  const user = currentUser(req);
  const spaces = await listSpaces(user.id);
  res.json(spaces);
});

relationshipRouter.get("/spaces/:spaceId", async (req, res) => {
  const user = currentUser(req);
  const { spaceId } = parse(spaceIdParamsSchema, req.params);
  const space = await getSpace(user.id, spaceId);
  res.json(space);
});

relationshipRouter.post("/spaces/:spaceId/invitations", async (req, res) => {
  const user = currentUser(req);
  const { spaceId } = parse(spaceIdParamsSchema, req.params);
  const invitation = await createInvitation(user.id, spaceId);
  res.status(201).json(invitation);
});

relationshipRouter.post("/invitations/accept", async (req, res) => {
  const user = currentUser(req);
  const { token } = parse(acceptInvitationSchema, req.body);
  const result = await acceptInvitation(user.id, token);
  res.json(result);
});

relationshipRouter.post("/invitations/:invitationId/revoke", async (req, res) => {
  const user = currentUser(req);
  const { invitationId } = parse(z.object({ invitationId: z.uuid() }), req.params);
  await revokeInvitation(user.id, invitationId);
  res.status(204).end();
});
