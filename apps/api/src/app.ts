import express from "express";
import pinoHttp from "pino-http";
import { sql } from "./db.js";
import { logger } from "./logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { identityRouter } from "./modules/identity/routes.js";
import { memoryRouter } from "./modules/memory/routes.js";
import { relationshipRouter } from "./modules/relationship/routes.js";

export function createApp() {
  const app = express();
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
