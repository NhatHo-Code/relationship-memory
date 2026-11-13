import { z } from "zod";

export const visibilitySchema = z.enum(["shared", "private"]);
export type Visibility = z.infer<typeof visibilitySchema>;

export const createMemorySchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(10_000).default(""),
  eventDate: z.iso.date(),
  datePrecision: z.enum(["day", "month", "year"]).default("day"),
  visibility: visibilitySchema,
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;

export const listMemoriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});
export type ListMemoriesQuery = z.infer<typeof listMemoriesQuerySchema>;

export const memoryIdParamsSchema = z.object({ memoryId: z.uuid() });

export const updateMemorySchema = z
  .object({
    version: z.number().int().min(1),
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().max(10_000).optional(),
    eventDate: z.iso.date().optional(),
    datePrecision: z.enum(["day", "month", "year"]).optional(),
    visibility: visibilitySchema.optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  })
  .refine((v) => Object.keys(v).length > 1, { message: "Nothing to update" });
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;

export interface MemoryDto {
  id: string;
  spaceId: string;
  creatorId: string;
  isMine: boolean;
  title: string;
  body: string;
  eventDate: string;
  datePrecision: "day" | "month" | "year";
  visibility: Visibility;
  tags: string[];
  aiStatus: "pending" | "ready" | "failed";
  version: number;
  createdAt: string;
  updatedAt: string;
}
