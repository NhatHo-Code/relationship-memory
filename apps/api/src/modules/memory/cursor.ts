import { z } from "zod";
import { AppError } from "../../lib/errors.js";

const cursorSchema = z.object({ eventDate: z.iso.date(), id: z.uuid() });
export type Cursor = z.infer<typeof cursorSchema>;

export const encodeCursor = (c: Cursor) =>
  Buffer.from(JSON.stringify(c)).toString("base64url");

export function decodeCursor(raw: string): Cursor {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
  } catch {
    throw new AppError(400, "INVALID_CURSOR", "Invalid cursor");
  }
}
