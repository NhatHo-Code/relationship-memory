import cors from "cors";
import express from "express";
import { config } from "./config.js";
import pinoHttp from "pino-http";
import { sql } from "./db.js";
import { logger } from "./logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { identityRouter } from "./modules/identity/routes.js";
import { makeAiRouter } from "./modules/ai/routes.js";
import { getProvider } from "./modules/ai/index.js";
import { memoryRouter } from "./modules/memory/routes.js";
import { relationshipRouter } from "./modules/relationship/routes.js";
import type { LLMProvider } from "./modules/ai/provider.js";

interface AppDeps {
  provider: LLMProvider;
}

export function createApp(deps: AppDeps = { provider: getProvider() }) {
  const app = express();
  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/ready", async (_req, res) => {
    await sql`select 1`;
    res.status(200).json({ status: "ready" });
  });

  app.use("/v1", identityRouter);
  app.use("/v1", relationshipRouter);
  app.use("/v1", memoryRouter);
  app.use("/v1", makeAiRouter(deps.provider));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
