import { sql } from "../../db.js";
import { AppError, forbidden, notFound } from "../../lib/errors.js";
import { pgmqQueue } from "../../lib/queue.js";
import type { CreateMemoryInput, ListMemoriesQuery, MemoryDto, UpdateMemoryInput, Visibility } from "@rm/shared";
import { requireMembership } from "../relationship/service.js";
import { INGEST_QUEUE } from "../ai/jobs.js";
import { decodeCursor, encodeCursor } from "./cursor.js";
import {
  deleteOwnMemory,
  findVisibleMemory,
  insertMemory,
  listVisibleMemories,
  updateOwnMemory,
} from "./repository.js";

function toMemoryDto(row: Record<string, unknown>, userId: string): MemoryDto {
  return {
    id: row.id as string,
    spaceId: row.spaceId as string,
    creatorId: row.creatorId as string,
    isMine: row.creatorId === userId,
    title: row.title as string,
    body: row.body as string,
    eventDate: row.eventDate as string,
    datePrecision: row.datePrecision as "day" | "month" | "year",
    visibility: row.visibility as Visibility,
    tags: row.tags as string[],
    aiStatus: row.aiStatus as "pending" | "ready" | "failed",
    version: row.version as number,
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString(),
  };
}

export async function createMemory(userId: string, spaceId: string, input: CreateMemoryInput) {
  await requireMembership(userId, spaceId);
  return sql.begin(async (tx) => {
    const row = await insertMemory(tx, {
      spaceId,
      creatorId: userId,
      title: input.title,
      body: input.body,
      eventDate: input.eventDate,
      datePrecision: input.datePrecision,
      visibility: input.visibility,
      tags: input.tags,
    });
    await pgmqQueue.enqueue(tx, INGEST_QUEUE, { memoryId: row.id, version: row.version });
    return toMemoryDto(row, userId);
  });
}

export async function listMemories(userId: string, spaceId: string, query: ListMemoriesQuery) {
  await requireMembership(userId, spaceId);
  const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
  const rows = await listVisibleMemories(sql, { userId, spaceId, limit: query.limit, cursor });

  const hasMore = rows.length > query.limit;
  const items = hasMore ? rows.slice(0, query.limit) : rows;
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem
      ? encodeCursor({ eventDate: lastItem.eventDate as string, id: lastItem.id as string })
      : null;

  return { items: items.map((r) => toMemoryDto(r, userId)), nextCursor };
}

export async function getMemory(userId: string, memoryId: string) {
  const row = await findVisibleMemory(sql, userId, memoryId);
  if (!row) throw notFound("Memory");
  return toMemoryDto(row, userId);
}

async function explainWriteFailure(userId: string, memoryId: string): Promise<never> {
  const visible = await findVisibleMemory(sql, userId, memoryId);
  if (!visible) throw notFound("Memory");
  if (visible.creatorId !== userId) throw forbidden("Only the creator can change this memory");
  throw new AppError(409, "VERSION_CONFLICT", "Memory was changed by another request", {
    currentVersion: visible.version,
  });
}

export async function updateMemory(userId: string, memoryId: string, input: UpdateMemoryInput) {
  const { version, ...rest } = input;
  const patch: Record<string, unknown> = { ai_status: "pending" };
  if (rest.title !== undefined) patch.title = rest.title;
  if (rest.body !== undefined) patch.body = rest.body;
  if (rest.eventDate !== undefined) patch.event_date = rest.eventDate;
  if (rest.datePrecision !== undefined) patch.date_precision = rest.datePrecision;
  if (rest.visibility !== undefined) patch.visibility = rest.visibility;
  if (rest.tags !== undefined) patch.tags = rest.tags;

  return sql.begin(async (tx) => {
    const row = await updateOwnMemory(tx, userId, memoryId, version, patch);
    if (!row) return explainWriteFailure(userId, memoryId);
    await pgmqQueue.enqueue(tx, INGEST_QUEUE, { memoryId, version: row.version as number });
    return toMemoryDto(row, userId);
  });
}

export async function deleteMemory(userId: string, memoryId: string) {
  const row = await deleteOwnMemory(sql, userId, memoryId);
  if (!row) return explainWriteFailure(userId, memoryId);
}
