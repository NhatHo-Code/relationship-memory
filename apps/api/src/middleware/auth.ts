import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
import type { AuthUser } from "../types/express.js";

const issuer = `${config.SUPABASE_URL}/auth/v1`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHENTICATED", "Missing bearer token");
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, {
      issuer,
      audience: "authenticated",
    });
    if (typeof payload.sub !== "string") throw new Error("no sub");
    req.user = {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
    } satisfies AuthUser;
  } catch {
    throw new AppError(401, "UNAUTHENTICATED", "Invalid or expired token");
  }
  next();
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  return req.user;
}
