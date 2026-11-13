import { z } from "zod";

export const visibilitySchema = z.enum(["shared", "private"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const createMemorySchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(10_000).default(""),
  eventDate: z.iso.date(), // "YYYY-MM-DD"
  datePrecision: z.enum(["day", "month", "year"]).default("day"), 
  visibility: visibilitySchema,
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
