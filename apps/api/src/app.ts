import express from "express";
import { sql } from "./db.js";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/ready", async (_req, res) => {
    await sql`select 1`;
    res.status(200).json({ status: "ready" });
  });

  return app;
}
