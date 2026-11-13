import { Router } from "express";
import { createSpaceSchema, spaceIdParamsSchema } from "@rm/shared";
import { parse } from "../../lib/parse.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import {
  createInvitation,
  createSpace,
  getSpace,
  listSpaces,
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
