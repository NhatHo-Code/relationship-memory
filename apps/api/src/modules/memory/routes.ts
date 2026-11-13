import { Router } from "express";
import { createMemorySchema, listMemoriesQuerySchema, memoryIdParamsSchema, spaceIdParamsSchema, updateMemorySchema } from "@rm/shared";
import { parse } from "../../lib/parse.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import { createMemory, deleteMemory, getMemory, listMemories, updateMemory } from "./service.js";

export const memoryRouter = Router();
memoryRouter.use(requireAuth);

memoryRouter.post("/spaces/:spaceId/memories", async (req, res) => {
  const user = currentUser(req);
  const { spaceId } = parse(spaceIdParamsSchema, req.params);
  const input = parse(createMemorySchema, req.body);
  const memory = await createMemory(user.id, spaceId, input);
  res.status(201).json(memory);
});

memoryRouter.get("/spaces/:spaceId/memories", async (req, res) => {
  const user = currentUser(req);
  const { spaceId } = parse(spaceIdParamsSchema, req.params);
  const query = parse(listMemoriesQuerySchema, req.query);
  const result = await listMemories(user.id, spaceId, query);
  res.json(result);
});

memoryRouter.get("/memories/:memoryId", async (req, res) => {
  const user = currentUser(req);
  const { memoryId } = parse(memoryIdParamsSchema, req.params);
  const memory = await getMemory(user.id, memoryId);
  res.json(memory);
});

memoryRouter.patch("/memories/:memoryId", async (req, res) => {
  const user = currentUser(req);
  const { memoryId } = parse(memoryIdParamsSchema, req.params);
  const input = parse(updateMemorySchema, req.body);
  const memory = await updateMemory(user.id, memoryId, input);
  res.json(memory);
});

memoryRouter.delete("/memories/:memoryId", async (req, res) => {
  const user = currentUser(req);
  const { memoryId } = parse(memoryIdParamsSchema, req.params);
  await deleteMemory(user.id, memoryId);
  res.status(204).end();
});
