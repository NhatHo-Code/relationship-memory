import type { z } from "zod";
import { AppError } from "./errors.js";

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid input", result.error.issues);
  }
  return result.data;
}
