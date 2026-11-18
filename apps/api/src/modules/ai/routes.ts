import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { chatRequestSchema, spaceIdParamsSchema } from "@rm/shared";
import { parse } from "../../lib/parse.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";
import type { LLMProvider } from "./provider.js";
import { askQuestion } from "./service.js";

export function makeAiRouter(provider: LLMProvider) {
  const router = Router();
  router.use(requireAuth);

  const chatRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? "anon"),
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post("/spaces/:spaceId/ai/chat", chatRateLimit, async (req, res) => {
    const user = currentUser(req);
    const { spaceId } = parse(spaceIdParamsSchema, req.params);
    const { question } = parse(chatRequestSchema, req.body);
    const result = await askQuestion(provider, user.id, spaceId, question);
    res.json(result);
  });

  return router;
}
