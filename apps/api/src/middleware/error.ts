import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ code: "ROUTE_NOT_FOUND", message: `Route ${req.method} ${req.path} not found` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
    return;
  }

  if (typeof err === "object" && err !== null && (err as Record<string, unknown>).type === "entity.parse.failed") {
    res.status(400).json({ code: "INVALID_JSON", message: "Request body is not valid JSON" });
    return;
  }

  req.log?.error({ err });
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong" });
}
